/**
 * Browser Interface
 * Abstraction for opening URLs in a browser context.
 * Implementations: ExpoBrowser, InAppBrowser
 */

export interface IBrowser {
  /**
   * Opens a URL in the system browser or in-app browser.
   * @param url - The URL to open
   * @returns Promise that resolves when browser is opened (may not wait for close)
   */
  openUrl(url: string): Promise<void>;

  /**
   * Opens a URL for authentication flow.
   * Some implementations may handle the redirect automatically.
   * @param url - The authorization URL
   * @param redirectUri - The expected redirect URI to watch for
   * @returns Promise that resolves with the callback URL if captured, or void
   */
  openAuthSession(url: string, redirectUri: string): Promise<string | null>;
}
