/**
 * Expo Linking Implementation
 * Uses expo-linking for handling deep links / universal links.
 */

import * as Linking from 'expo-linking';
import { requireNativeModule } from 'expo-modules-core';
import { ILinking } from '../interfaces/ILinking';

// Access Expo's native linking module directly — the same module that
// expo-linking's useLinkingURL() hook uses internally. This is more
// reliable than React Native's Linking.addEventListener('url') because
// ExpoAppDelegate routes URLs through Expo's subscriber system first.
const ExpoLinkingNative = requireNativeModule<{
  getLinkingURL(): string | null;
  addListener(eventName: string, listener: (event: any) => void): { remove(): void };
}>('ExpoLinking');

export class ExpoLinking implements ILinking {
  /**
   * Parses a URL and extracts OIDC callback parameters.
   */
  parseUrl(url: string): { code?: string; state?: string; error?: string; error_description?: string } {
    const parsed = Linking.parse(url);

    return {
      code: parsed.queryParams?.code as string | undefined,
      state: parsed.queryParams?.state as string | undefined,
      error: parsed.queryParams?.error as string | undefined,
      error_description: parsed.queryParams?.error_description as string | undefined,
    };
  }

  /**
   * Gets the initial URL that launched the app.
   */
  async getInitialUrl(): Promise<string | null> {
    return ExpoLinkingNative.getLinkingURL() ?? null;
  }

  /**
   * Adds a listener for incoming URLs.
   * @returns Cleanup function to remove the listener
   */
  addListener(callback: (url: string) => void): () => void {
    const subscription = ExpoLinkingNative.addListener('onURLReceived', (event: any) => {
      callback(typeof event === 'string' ? event : event.url);
    });

    return () => {
      subscription.remove();
    };
  }
}
