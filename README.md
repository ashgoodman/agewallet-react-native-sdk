# AgeWallet React Native SDK

Age verification SDK for React Native applications using AgeWallet.

## Installation

```bash
npm install agewallet-react-native-sdk
```

### Expo Projects

Install the required Expo packages:

```bash
npx expo install expo-crypto expo-web-browser expo-linking react-native-keychain
```

### Bare React Native Projects

(Coming soon)

## Usage

```typescript
import { AgeWallet } from 'agewallet-react-native-sdk/expo';

// Initialize the SDK
const ageWallet = new AgeWallet({
  clientId: 'your-client-id',
  redirectUri: 'https://yourapp.com/callback',
});

// Check if user is verified
const isVerified = await ageWallet.isVerified();

if (!isVerified) {
  // Start verification flow
  await ageWallet.startVerification();
}
```

## Configuration

### AgeWallet Dashboard Setup

1. Register your app on the [AgeWallet Dashboard](https://app.agewallet.io)
2. Create a **public client** (no client secret)
3. Set your redirect URI to your app's universal link (e.g., `https://yourapp.com/callback`)

### Universal Links Setup

Your app must handle universal links to receive the OAuth callback.

#### iOS (apple-app-site-association)

Host this file at `https://yourapp.com/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.yourcompany.yourapp",
        "paths": ["/callback"]
      }
    ]
  }
}
```

#### Android (assetlinks.json)

Host this file at `https://yourapp.com/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.yourapp",
      "sha256_cert_fingerprints": ["YOUR_SIGNING_CERTIFICATE_SHA256"]
    }
  }
]
```

### Expo Configuration (app.json)

```json
{
  "expo": {
    "scheme": "yourapp",
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "associatedDomains": ["applinks:yourapp.com"]
    },
    "android": {
      "package": "com.yourcompany.yourapp",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "yourapp.com",
              "pathPrefix": "/callback"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## API Reference

### `new AgeWallet(config)`

Creates a new AgeWallet instance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Your client ID from AgeWallet dashboard |
| `redirectUri` | string | Yes | Your app's universal link callback URL |
| `endpoints` | object | No | Override default API endpoints |

### `isVerified(): Promise<boolean>`

Checks if the user is currently verified.

Returns `true` if verified and not expired, `false` otherwise.

### `startVerification(): Promise<void>`

Starts the verification flow. Opens the system browser to the AgeWallet authorization page.

With Expo's `openAuthSessionAsync`, the callback is handled automatically and verification completes when control returns to your app.

### `handleCallback(url: string): Promise<boolean>`

Manually handles a callback URL. Usually not needed with Expo.

Use this if you're handling deep links manually or if `startVerification()` doesn't capture the callback.

### `clearVerification(): Promise<void>`

Clears the stored verification state (logout).

### `getInitialUrl(): Promise<string | null>`

Gets the URL that launched the app, if any. Useful for handling callbacks when the app was closed during verification.

### `addUrlListener(callback): () => void`

Adds a listener for incoming URLs while the app is running.

Returns a cleanup function to remove the listener.

## Example

See the [example](./example) directory for a complete demo app.

## Security

- This SDK is for **public clients only** (no client secret)
- Uses **PKCE (S256)** for secure authorization code exchange
- Tokens are stored securely using device keychain/keystore

## License

MIT
