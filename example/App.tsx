import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AgeWallet } from 'agewallet-react-native-sdk/expo';

// Auto-detected default metadata identifies the demo build to the dev/QA team
// when verifications land on the server.
const AUTO_DEFAULT_METADATA = Platform.OS === 'ios' ? 'React Native iOS' : 'React Native Android';

const ageWallet = new AgeWallet({
  clientId: 'your-client-id',
  redirectUri: 'https://agewallet-sdk-demo.netlify.app/callback',
  endpoints: {
    auth: 'https://app.agewallet.io/user/authorize',
    token: 'https://app.agewallet.io/user/token',
    userinfo: 'https://app.agewallet.io/user/userinfo',
  },
  metadata: AUTO_DEFAULT_METADATA,
});

export default function App() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [customAppend, setCustomAppend] = useState('');
  const [lastMetadata, setLastMetadata] = useState<string | null>(null);

  const addLog = (msg: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    setDebugLog((prev) => [...prev.slice(-9), `${ts} ${msg}`]);
  };

  useEffect(() => {
    checkVerification();
  }, []);

  useEffect(() => {
    const handleResult = (result: string, tag: string) => {
      addLog(`${tag}: ${result}`);
      if (result === 'denied') {
        Alert.alert('Verification Cancelled', 'Age verification was cancelled.');
      } else if (result === 'failed') {
        Alert.alert('Verification Failed', 'Verification could not be completed. Please try again.');
      }
    };

    // iOS: the SDK opens external Safari and returns null from startVerification —
    // the Linking listener below is the only way the OIDC callback reaches handleCallback.
    // Android: the SDK captures the callback directly via the native AgeWalletCallback
    // module + polling inside startVerification. Registering a Linking listener here would
    // produce a second handleCallback call for the same URL, racing the SDK's internal call
    // and surfacing as a false-negative "Verification Failed" alert followed by the
    // delayed success.
    if (Platform.OS !== 'ios') {
      return;
    }

    const cleanup = ageWallet.addUrlListener(async (url) => {
      addLog(`listener url: ${url.substring(0, 60)}`);
      if (url.includes('/callback')) {
        setIsVerifying(true);
        try {
          const result = await ageWallet.handleCallback(url);
          handleResult(result, 'handleCallback');
        } catch (e: unknown) {
          addLog(`handleCallback ERR: ${e}`);
        }
        await checkVerification();
        setIsVerifying(false);
      }
    });

    ageWallet.getInitialUrl().then(async (url) => {
      addLog(`initialUrl: ${url ? url.substring(0, 60) : 'null'}`);
      if (url && url.includes('/callback')) {
        setIsVerifying(true);
        try {
          const result = await ageWallet.handleCallback(url);
          handleResult(result, 'handleCallback(init)');
        } catch (e: unknown) {
          addLog(`handleCallback(init) ERR: ${e}`);
        }
        await checkVerification();
        setIsVerifying(false);
      }
    });

    return cleanup;
  }, []);

  const checkVerification = async () => {
    setIsLoading(true);
    const verified = await ageWallet.isVerified();
    setIsVerified(verified);
    if (verified) {
      const md = await ageWallet.getMetadata();
      setLastMetadata(md);
    } else {
      setLastMetadata(null);
    }
    setIsLoading(false);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      // If "Custom metadata" has content, append it to the auto-default for this
      // verification only. Otherwise the instance default (set in constructor) kicks in.
      const custom = customAppend.trim();
      const override = custom.length > 0 ? `${AUTO_DEFAULT_METADATA} | ${custom}` : undefined;
      const result = await ageWallet.startVerification({ metadata: override });
      if (result === 'denied') {
        Alert.alert('Verification Cancelled', 'Age verification was cancelled.');
      } else if (result === 'failed') {
        Alert.alert('Verification Failed', 'Verification could not be completed. Please try again.');
      }
      await checkVerification();
    } catch (error: any) {
      if (typeof error?.message === 'string' && error.message.includes('metadata')) {
        Alert.alert('Invalid metadata', error.message);
      } else {
        console.error('Verification failed:', error);
      }
    }
    setIsVerifying(false);
  };

  const handleLogout = async () => {
    await ageWallet.clearVerification();
    setIsVerified(false);
    setLastMetadata(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Checking verification status...</Text>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>AgeWallet SDK Demo</Text>

        {isVerified ? (
          <View style={styles.card}>
            <Text style={styles.verifiedIcon}>✓</Text>
            <Text style={styles.verifiedText}>Age Verified</Text>
            <Text style={styles.description}>
              You have been verified and can access age-restricted content.
            </Text>

            <View style={styles.metadataBox}>
              <Text style={styles.metadataLabel}>Metadata attached to current verification:</Text>
              <Text style={styles.metadataValue}>{lastMetadata ?? '(none)'}</Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Clear Verification</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.gateIcon}>🔒</Text>
            <Text style={styles.gateTitle}>Age Verification Required</Text>
            <Text style={styles.description}>
              This content is age-restricted. Please verify your age to continue.
            </Text>

            <Text style={styles.sectionLabel}>Default metadata (auto)</Text>
            <View style={[styles.input, { paddingVertical: 12 }]}>
              <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#1F2937', fontSize: 14 }}>
                {AUTO_DEFAULT_METADATA}
              </Text>
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Custom metadata (optional, appended for this call only)</Text>
            <TextInput
              style={styles.input}
              value={customAppend}
              onChangeText={setCustomAppend}
              placeholder="e.g. order-1234"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              If populated, sent as "{AUTO_DEFAULT_METADATA} | &lt;your text&gt;" for this verification only.
            </Text>

            <TouchableOpacity
              style={[styles.verifyButton, isVerifying && styles.buttonDisabled, { marginTop: 16 }]}
              onPress={handleVerify}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify with AgeWallet</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Text style={styles.footer}>
        AgeWallet React Native SDK demo
      </Text>

      {debugLog.length > 0 && (
        <ScrollView style={styles.debugPanel}>
          {debugLog.map((line, i) => (
            <Text key={i} style={styles.debugLine}>{line}</Text>
          ))}
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#1f2937' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gateIcon: { fontSize: 44, marginBottom: 12, textAlign: 'center' },
  gateTitle: { fontSize: 20, fontWeight: '600', color: '#1f2937', marginBottom: 8, textAlign: 'center' },
  description: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  helperText: { fontSize: 11, color: '#9ca3af', marginTop: 4, marginBottom: 8 },
  row: { flexDirection: 'row' },
  smallButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallButtonText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  verifyButton: { backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  verifyButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  outlineButtonText: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  verifiedIcon: { fontSize: 44, color: '#10b981', marginBottom: 12, textAlign: 'center' },
  verifiedText: { fontSize: 20, fontWeight: '600', color: '#10b981', marginBottom: 8, textAlign: 'center' },
  metadataBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metadataLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  metadataValue: { fontSize: 13, fontFamily: 'monospace', color: '#1f2937' },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: { color: '#6b7280', fontSize: 15 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },
  footer: { textAlign: 'center', padding: 12, color: '#9ca3af', fontSize: 13 },
  debugPanel: { backgroundColor: '#111', maxHeight: 120, paddingHorizontal: 8, paddingVertical: 4 },
  debugLine: { color: '#0f0', fontSize: 10, fontFamily: 'monospace', lineHeight: 14 },
});
