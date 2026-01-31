/**
 * Expo Browser Implementation
 * Uses expo-web-browser for opening URLs and auth sessions.
 */

import * as WebBrowser from 'expo-web-browser';
import { IBrowser } from '../interfaces/IBrowser';

export class ExpoBrowser implements IBrowser {
  /**
   * Opens a URL in the system browser.
   */
  async openUrl(url: string): Promise<void> {
    await WebBrowser.openBrowserAsync(url);
  }

  /**
   * Opens an authentication session.
   * Uses WebBrowser.openAuthSessionAsync which handles the redirect.
   * @returns The callback URL if captured, null otherwise
   */
  async openAuthSession(url: string, redirectUri: string): Promise<string | null> {
    const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);

    if (result.type === 'success' && result.url) {
      return result.url;
    }

    // User cancelled or other non-success result
    return null;
  }
}
