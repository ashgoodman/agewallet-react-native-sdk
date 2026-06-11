/**
 * AgeWallet Core
 * Platform-agnostic OIDC flow implementation.
 * Browser and Linking implementations are injected.
 */

import { IBrowser } from '../interfaces/IBrowser';
import { ILinking } from '../interfaces/ILinking';
import { Security } from './Security';
import { Storage } from './Storage';
import {
  AgeWalletConfig,
  AgeWalletEndpoints,
  AgeWalletResult,
  DEFAULT_ENDPOINTS,
  TokenResponse,
  UserInfo,
} from './types';

export class AgeWalletCore {
  /** Maximum byte length for the metadata string (matches server-side limit). */
  static readonly METADATA_MAX_BYTES = 4096;

  private config: { clientId: string; redirectUri: string; endpoints: AgeWalletEndpoints };
  private security: Security;
  private storage: Storage;
  private browser: IBrowser;
  private linking: ILinking;

  /** Runtime metadata default; mutable via setMetadata(). Initialised from config.metadata. */
  private currentMetadata: string | undefined;

  constructor(
    config: AgeWalletConfig,
    browser: IBrowser,
    linking: ILinking
  ) {
    if (!config.clientId) {
      throw new Error('[AgeWallet] Missing clientId');
    }
    if (!config.redirectUri) {
      throw new Error('[AgeWallet] Missing redirectUri');
    }

    this.config = {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      endpoints: {
        ...DEFAULT_ENDPOINTS,
        ...config.endpoints,
      },
    };

    this.validateMetadata(config.metadata);
    this.currentMetadata = config.metadata;

    this.security = new Security();
    this.storage = new Storage();
    this.browser = browser;
    this.linking = linking;
  }

  /**
   * Checks if the user is verified.
   * @returns true if verified and not expired, false otherwise
   */
  async isVerified(): Promise<boolean> {
    const verification = await this.storage.getVerification();
    return verification?.isVerified ?? false;
  }

  /**
   * Update the metadata default attached to subsequent verifications.
   * Pass undefined to clear. Throws if value exceeds 4096 bytes.
   */
  setMetadata(value: string | undefined | null): void {
    const normalized = value ?? undefined;
    this.validateMetadata(normalized);
    this.currentMetadata = normalized;
  }

  /**
   * Return the metadata that round-tripped with the current persisted verification, or null.
   */
  async getMetadata(): Promise<string | null> {
    const verification = await this.storage.getVerification();
    return verification?.metadata ?? null;
  }

  private validateMetadata(value: string | undefined): void {
    if (value === undefined || value === null) return;
    if (typeof value !== 'string') {
      throw new Error('[AgeWallet] metadata must be a string');
    }
    // UTF-8 byte length via the classic encodeURIComponent trick — portable across all JS runtimes.
    const bytes = unescape(encodeURIComponent(value)).length;
    if (bytes > AgeWalletCore.METADATA_MAX_BYTES) {
      throw new Error(`[AgeWallet] metadata exceeds ${AgeWalletCore.METADATA_MAX_BYTES}-byte limit`);
    }
  }

  /**
   * Starts the verification flow.
   * Opens browser to AgeWallet authorization page.
   *
   * @param options.metadata - Optional per-call override; does NOT change the instance default.
   */
  async startVerification(options: { metadata?: string } = {}): Promise<AgeWalletResult | null> {
    const effectiveMetadata = options.metadata ?? this.currentMetadata;
    this.validateMetadata(effectiveMetadata);


    // Generate PKCE
    const verifier = this.security.generatePkceVerifier();
    const challenge = await this.security.generatePkceChallenge(verifier);
    const state = `rn:${this.security.generateState()}`;
    const nonce = this.security.generateNonce();

    // Store OIDC state
    await this.storage.setOidcState({ state, verifier, nonce });

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'openid age',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      nonce,
    });

    if (effectiveMetadata) {
      params.append('metadata', effectiveMetadata);
    }

    const authUrl = `${this.config.endpoints.auth}?${params.toString()}`;

    // Open auth session - may return callback URL directly
    const callbackUrl = await this.browser.openAuthSession(authUrl, this.config.redirectUri);

    // If browser returned the callback URL, handle it and return the result
    if (callbackUrl) {
      return this.handleCallback(callbackUrl);
    }

    return null;
  }

  /**
   * Handles the callback URL from the authorization flow.
   * @param url - The callback URL with code and state
   * @returns AgeWalletResult indicating the outcome
   */
  async handleCallback(url: string): Promise<AgeWalletResult> {
    const parsed = this.linking.parseUrl(url);

    // Handle errors
    if (parsed.error) {
      console.error(`[AgeWallet] Authorization error: ${parsed.error} - ${parsed.error_description}`);
      await this.storage.clearOidcState();
      return parsed.error_description === 'The user denied the request' ? 'denied' : 'failed';
    }

    if (!parsed.code || !parsed.state) {
      console.error('[AgeWallet] Missing code or state in callback');
      await this.storage.clearOidcState();
      return 'failed';
    }

    // Validate state
    const storedState = await this.storage.getOidcState();
    if (!storedState || storedState.state !== parsed.state) {
      console.error('[AgeWallet] Invalid state or session expired');
      await this.storage.clearOidcState();
      return 'failed';
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await this.exchangeCode(parsed.code, storedState.verifier);

      // Fetch user info to verify age
      const userInfo = await this.fetchUserInfo(tokenResponse.access_token);

      if (!userInfo.age_verified) {
        console.error('[AgeWallet] Age verification failed');
        await this.storage.clearOidcState();
        return 'failed';
      }

      // Store verification state (including any metadata round-tripped via /userinfo)
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
      await this.storage.setVerification({
        accessToken: tokenResponse.access_token,
        expiresAt,
        isVerified: true,
        ...(userInfo.metadata ? { metadata: userInfo.metadata } : {}),
      });

      // Clear OIDC state
      await this.storage.clearOidcState();

      return 'success';
    } catch (error) {
      console.error('[AgeWallet] Token exchange failed:', error);
      await this.storage.clearOidcState();
      return 'failed';
    }
  }

  /**
   * Clears verification state (logout).
   */
  async clearVerification(): Promise<void> {
    await this.storage.clearVerification();
  }

  /**
   * Exchanges authorization code for tokens.
   */
  private async exchangeCode(code: string, verifier: string): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      code,
      code_verifier: verifier,
    });

    const response = await fetch(this.config.endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token endpoint returned ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetches user info to verify age claim.
   */
  private async fetchUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(this.config.endpoints.userinfo, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Userinfo endpoint returned ${response.status}`);
    }

    return response.json();
  }
}
