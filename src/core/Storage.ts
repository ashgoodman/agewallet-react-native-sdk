/**
 * AgeWallet Storage Module
 * Secure storage for OIDC state and verification tokens.
 * Uses react-native-keychain for secure persistence.
 */

import * as Keychain from 'react-native-keychain';
import { OidcState, VerificationState } from './types';

const OIDC_STATE_KEY = 'agewallet_oidc_state';
const VERIFICATION_KEY = 'agewallet_verification';
const SERVICE_NAME = 'io.agewallet.sdk';

export class Storage {
  /**
   * Stores OIDC state (temporary, during auth flow).
   */
  async setOidcState(state: OidcState): Promise<void> {
    const data = JSON.stringify(state);
    await Keychain.setGenericPassword(OIDC_STATE_KEY, data, {
      service: `${SERVICE_NAME}.oidc`,
    });
  }

  /**
   * Retrieves OIDC state.
   */
  async getOidcState(): Promise<OidcState | null> {
    try {
      const result = await Keychain.getGenericPassword({
        service: `${SERVICE_NAME}.oidc`,
      });
      if (result && result.password) {
        return JSON.parse(result.password) as OidcState;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clears OIDC state (after auth flow completes).
   */
  async clearOidcState(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: `${SERVICE_NAME}.oidc`,
      });
    } catch {
      // Ignore errors when clearing
    }
  }

  /**
   * Stores verification state (long-lived).
   */
  async setVerification(state: VerificationState): Promise<void> {
    const data = JSON.stringify(state);
    await Keychain.setGenericPassword(VERIFICATION_KEY, data, {
      service: `${SERVICE_NAME}.verification`,
    });
  }

  /**
   * Retrieves verification state.
   * Returns null if expired or not found.
   */
  async getVerification(): Promise<VerificationState | null> {
    try {
      const result = await Keychain.getGenericPassword({
        service: `${SERVICE_NAME}.verification`,
      });
      if (result && result.password) {
        const state = JSON.parse(result.password) as VerificationState;
        // Check expiry
        if (state.expiresAt > Date.now()) {
          return state;
        }
        // Expired - clear it
        await this.clearVerification();
        return null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clears verification state (logout).
   */
  async clearVerification(): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: `${SERVICE_NAME}.verification`,
      });
    } catch {
      // Ignore errors when clearing
    }
  }
}
