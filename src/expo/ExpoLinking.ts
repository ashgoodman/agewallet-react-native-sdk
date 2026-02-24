/**
 * Expo Linking Implementation
 * Uses expo-linking for handling deep links / universal links.
 */

import * as Linking from 'expo-linking';
import { ILinking } from '../interfaces/ILinking';

export class ExpoLinking implements ILinking {
  /**
   * Parses a URL and extracts OIDC callback parameters.
   */
  parseUrl(url: string): { code?: string; state?: string; error?: string; error_description?: string } {
    const params = new URL(url).searchParams;

    return {
      code: params.get('code') ?? undefined,
      state: params.get('state') ?? undefined,
      error: params.get('error') ?? undefined,
      error_description: params.get('error_description') ?? undefined,
    };
  }

  /**
   * Gets the initial URL that launched the app.
   */
  async getInitialUrl(): Promise<string | null> {
    const url = await Linking.getInitialURL();
    return url;
  }

  /**
   * Adds a listener for incoming URLs.
   * @returns Cleanup function to remove the listener
   */
  addListener(callback: (url: string) => void): () => void {
    const subscription = Linking.addEventListener('url', (event) => {
      callback(event.url);
    });

    return () => {
      subscription.remove();
    };
  }
}
