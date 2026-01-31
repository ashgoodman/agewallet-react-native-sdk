/**
 * Linking Interface
 * Abstraction for handling deep links / universal links.
 * Implementations: ExpoLinking, NativeLinking
 */

export interface ILinking {
  /**
   * Parses a URL and extracts query parameters.
   * @param url - The callback URL to parse
   * @returns Object with code and state if present
   */
  parseUrl(url: string): { code?: string; state?: string; error?: string; error_description?: string };

  /**
   * Gets the initial URL that launched the app (if any).
   * Useful for handling callbacks when app was closed.
   * @returns Promise resolving to the URL or null
   */
  getInitialUrl(): Promise<string | null>;

  /**
   * Adds a listener for incoming URLs while app is running.
   * @param callback - Function to call when a URL is received
   * @returns Cleanup function to remove the listener
   */
  addListener(callback: (url: string) => void): () => void;
}
