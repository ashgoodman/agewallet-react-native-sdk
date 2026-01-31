/**
 * AgeWallet React Native SDK - Expo Entry Point
 *
 * Usage:
 * ```typescript
 * import { AgeWallet } from 'agewallet-react-native-sdk/expo';
 *
 * const ageWallet = new AgeWallet({
 *   clientId: 'your-client-id',
 *   redirectUri: 'https://yourapp.com/callback',
 * });
 *
 * // Check if verified
 * const verified = await ageWallet.isVerified();
 *
 * // Start verification
 * await ageWallet.startVerification();
 *
 * // Handle callback (if not using openAuthSessionAsync auto-capture)
 * await ageWallet.handleCallback(url);
 *
 * // Clear verification
 * await ageWallet.clearVerification();
 * ```
 */

import { AgeWalletConfig } from '../core/types';
import { AgeWalletCore } from '../core/AgeWalletCore';
import { ExpoBrowser } from './ExpoBrowser';
import { ExpoLinking } from './ExpoLinking';

export class AgeWallet {
  private core: AgeWalletCore;
  private linking: ExpoLinking;

  constructor(config: AgeWalletConfig) {
    const browser = new ExpoBrowser();
    this.linking = new ExpoLinking();
    this.core = new AgeWalletCore(config, browser, this.linking);
  }

  /**
   * Checks if the user is verified.
   * @returns true if verified and not expired, false otherwise
   */
  async isVerified(): Promise<boolean> {
    return this.core.isVerified();
  }

  /**
   * Starts the verification flow.
   * Opens browser to AgeWallet authorization page.
   * With Expo's openAuthSessionAsync, the callback is usually handled automatically.
   */
  async startVerification(): Promise<void> {
    return this.core.startVerification();
  }

  /**
   * Handles the callback URL from the authorization flow.
   * Usually not needed with Expo as openAuthSessionAsync captures the callback.
   * Use this if handling deep links manually.
   * @param url - The callback URL with code and state
   * @returns true if verification succeeded, false otherwise
   */
  async handleCallback(url: string): Promise<boolean> {
    return this.core.handleCallback(url);
  }

  /**
   * Clears verification state (logout).
   */
  async clearVerification(): Promise<void> {
    return this.core.clearVerification();
  }

  /**
   * Gets the initial URL that launched the app (if any).
   * Useful for handling callbacks when app was closed.
   */
  async getInitialUrl(): Promise<string | null> {
    return this.linking.getInitialUrl();
  }

  /**
   * Adds a listener for incoming URLs.
   * @returns Cleanup function to remove the listener
   */
  addUrlListener(callback: (url: string) => void): () => void {
    return this.linking.addListener(callback);
  }
}

// Re-export types for convenience
export type { AgeWalletConfig } from '../core/types';
