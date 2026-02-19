/**
 * Expo Browser Implementation
 * Uses expo-web-browser for opening URLs and auth sessions.
 */

import * as WebBrowser from 'expo-web-browser';
import { Platform, NativeModules, Linking } from 'react-native';
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
   * On iOS: uses native ASWebAuthenticationSession via openAuthSessionAsync.
   * On Android: uses openBrowserAsync (fire-and-forget) + Linking listener,
   * because openAuthSessionAsync's JS polyfill unreliably races AppState vs
   * Linking events with HTTPS redirect URIs.
   * @returns The callback URL if captured, null otherwise
   */
  async openAuthSession(url: string, redirectUri: string): Promise<string | null> {
    if (Platform.OS === 'android') {
      return this._openAuthSessionAndroid(url, redirectUri);
    }

    const result = await WebBrowser.openAuthSessionAsync(url, redirectUri);
    if (result.type === 'success' && result.url) {
      return result.url;
    }
    return null;
  }

  private async _openAuthSessionAndroid(url: string, redirectUri: string): Promise<string | null> {
    console.log('[AW] openBrowserAsync start');
    WebBrowser.openBrowserAsync(url, { showInRecents: true }).catch((e: unknown) => {
      console.log('[AW] openBrowserAsync error:', e);
    });

    const POLL_MS = 500;
    const MAX_MS = 5 * 60 * 1000;
    let elapsed = 0;
    let pollCount = 0;

    console.log('[AW] module available:', !!NativeModules.AgeWalletCallback);

    return new Promise<string | null>((resolve) => {
      const poll = async () => {
        pollCount++;
        try {
          const callbackUrl: string | null = await NativeModules.AgeWalletCallback.getAndClear();
          if (pollCount <= 3 || pollCount % 20 === 0) {
            console.log('[AW] poll#' + pollCount + ' result=' + callbackUrl);
          }
          if (callbackUrl && callbackUrl.startsWith(redirectUri)) {
            console.log('[AW] GOT URL: ' + callbackUrl.substring(0, 100));
            resolve(callbackUrl);
            return;
          }
        } catch (e: unknown) {
          console.log('[AW] poll#' + pollCount + ' ERROR: ' + e);
          resolve(null);
          return;
        }
        elapsed += POLL_MS;
        if (elapsed >= MAX_MS) {
          console.log('[AW] poll timed out');
          resolve(null);
          return;
        }
        setTimeout(poll, POLL_MS);
      };
      setTimeout(poll, POLL_MS);
    });
  }
}
