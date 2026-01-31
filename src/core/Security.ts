/**
 * AgeWallet Security Module
 * Handles PKCE generation for OIDC flow.
 * Uses expo-crypto for cryptographic operations.
 */

import * as Crypto from 'expo-crypto';

export class Security {
  /**
   * Generates a cryptographically secure random hex string.
   * @param length - Number of bytes (output will be 2x length in hex)
   */
  generateRandomString(length: number = 32): string {
    const randomBytes = Crypto.getRandomBytes(length);
    return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generates a PKCE Code Verifier.
   * RFC 7636: "min 43 chars, max 128 chars"
   * @returns URL-safe base64 string (~86 chars)
   */
  generatePkceVerifier(): string {
    const randomBytes = Crypto.getRandomBytes(64);
    return this.base64UrlEncode(randomBytes);
  }

  /**
   * Generates the S256 Code Challenge from a Verifier.
   * @param verifier - The PKCE verifier string
   * @returns Promise resolving to the challenge string
   */
  async generatePkceChallenge(verifier: string): Promise<string> {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    // Convert standard base64 to URL-safe base64
    return digest
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Generates state parameter for CSRF protection.
   */
  generateState(): string {
    return this.generateRandomString(16);
  }

  /**
   * Generates nonce for replay protection.
   */
  generateNonce(): string {
    return this.generateRandomString(16);
  }

  /**
   * URL-safe Base64 encoding (RFC 4648)
   */
  private base64UrlEncode(bytes: Uint8Array): string {
    // Convert bytes to base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Make URL-safe
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
