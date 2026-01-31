/**
 * AgeWallet React Native SDK - Type Definitions
 */

export interface AgeWalletConfig {
  /** Client ID from AgeWallet dashboard */
  clientId: string;
  /** HTTPS redirect URI (universal link) */
  redirectUri: string;
  /** Optional: Override default endpoints */
  endpoints?: Partial<AgeWalletEndpoints>;
}

export interface AgeWalletEndpoints {
  auth: string;
  token: string;
  userinfo: string;
}

export interface OidcState {
  state: string;
  verifier: string;
  nonce: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

export interface VerificationState {
  accessToken: string;
  expiresAt: number;
  isVerified: boolean;
}

export interface UserInfo {
  sub: string;
  age_verified: boolean;
}

export const DEFAULT_ENDPOINTS: AgeWalletEndpoints = {
  auth: 'https://app.agewallet.io/user/authorize',
  token: 'https://app.agewallet.io/user/token',
  userinfo: 'https://app.agewallet.io/user/userinfo',
};
