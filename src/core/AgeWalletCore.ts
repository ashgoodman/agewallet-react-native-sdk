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
  DEFAULT_ENDPOINTS,
  TokenResponse,
  UserInfo,
  VerificationState,
} from './types';

export class AgeWalletCore {
  private config: Required<AgeWalletConfig> & { endpoints: AgeWalletEndpoints };
  private security: Security;
  private storage: Storage;
  private browser: IBrowser;
  private linking: ILinking;

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
   * Starts the verification flow.
   * Opens browser to AgeWallet authorization page.
   */
  async startVerification(): Promise<void> {
    // Generate PKCE
    const verifier = this.security.generatePkceVerifier();
    const challenge = await this.security.generatePkceChallenge(verifier);
    const state = this.security.generateState();
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

    const authUrl = `${this.config.endpoints.auth}?${params.toString()}`;

    // Open auth session - may return callback URL directly
    const callbackUrl = await this.browser.openAuthSession(authUrl, this.config.redirectUri);

    // If browser returned the callback URL, handle it
    if (callbackUrl) {
      await this.handleCallback(callbackUrl);
    }
  }

  /**
   * Handles the callback URL from the authorization flow.
   * @param url - The callback URL with code and state
   * @returns true if verification succeeded, false otherwise
   */
  async handleCallback(url: string): Promise<boolean> {
    const parsed = this.linking.parseUrl(url);

    // Handle errors (including regional exemptions)
    if (parsed.error) {
      return this.handleError(parsed.error, parsed.error_description, parsed.state);
    }

    if (!parsed.code || !parsed.state) {
      console.error('[AgeWallet] Missing code or state in callback');
      return false;
    }

    // Validate state
    const storedState = await this.storage.getOidcState();
    if (!storedState || storedState.state !== parsed.state) {
      console.error('[AgeWallet] Invalid state or session expired');
      return false;
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await this.exchangeCode(parsed.code, storedState.verifier);

      // Fetch user info to verify age
      const userInfo = await this.fetchUserInfo(tokenResponse.access_token);

      if (!userInfo.age_verified) {
        console.error('[AgeWallet] Age verification failed');
        return false;
      }

      // Store verification state
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
      await this.storage.setVerification({
        accessToken: tokenResponse.access_token,
        expiresAt,
        isVerified: true,
      });

      // Clear OIDC state
      await this.storage.clearOidcState();

      return true;
    } catch (error) {
      console.error('[AgeWallet] Token exchange failed:', error);
      return false;
    }
  }

  /**
   * Clears verification state (logout).
   */
  async clearVerification(): Promise<void> {
    await this.storage.clearVerification();
  }

  /**
   * Handles OIDC errors, including regional exemptions.
   */
  private async handleError(
    error: string,
    description?: string,
    state?: string
  ): Promise<boolean> {
    // Validate state
    const storedState = await this.storage.getOidcState();
    if (!storedState || storedState.state !== state) {
      console.warn('[AgeWallet] Error received with invalid state');
      return false;
    }

    // Check for regional exemption
    if (error === 'access_denied' && description === 'Region does not require verification') {
      console.log('[AgeWallet] Regional exemption detected');

      // Store synthetic verification (24h validity)
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
      await this.storage.setVerification({
        accessToken: 'region_exempt',
        expiresAt,
        isVerified: true,
      });

      await this.storage.clearOidcState();
      return true;
    }

    console.error(`[AgeWallet] OIDC Error: ${error} - ${description}`);
    return false;
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
