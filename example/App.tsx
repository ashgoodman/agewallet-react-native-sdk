import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AgeWallet } from 'agewallet-react-native-sdk/expo';

// Initialize AgeWallet SDK
// Replace 'your-client-id' with your actual client ID from AgeWallet dashboard
const ageWallet = new AgeWallet({
  clientId: '239472f9-3398-47ea-ad13-fe9502a0eb33',
  redirectUri: 'https://agewallet-sdk-demo.netlify.app/callback',
});

export default function App() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addLog = (msg: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    setDebugLog((prev) => [...prev.slice(-9), `${ts} ${msg}`]);
  };

  // Check verification status on mount
  useEffect(() => {
    checkVerification();
  }, []);

  // Handle incoming URLs (for manual deep link handling if needed)
  useEffect(() => {
    const cleanup = ageWallet.addUrlListener(async (url) => {
      addLog(`listener url: ${url.substring(0, 60)}`);
      if (url.includes('/callback')) {
        setIsVerifying(true);
        try {
          const result = await ageWallet.handleCallback(url);
          addLog(`handleCallback: ${result}`);
        } catch (e: unknown) {
          addLog(`handleCallback ERR: ${e}`);
        }
        await checkVerification();
        setIsVerifying(false);
      }
    });

    // Check if app was opened with a URL
    ageWallet.getInitialUrl().then(async (url) => {
      addLog(`initialUrl: ${url ? url.substring(0, 60) : 'null'}`);
      if (url && url.includes('/callback')) {
        setIsVerifying(true);
        try {
          const result = await ageWallet.handleCallback(url);
          addLog(`handleCallback(init): ${result}`);
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
    setIsLoading(false);
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      await ageWallet.startVerification();
      // With Expo, the callback is usually handled automatically
      await checkVerification();
    } catch (error) {
      console.error('Verification failed:', error);
    }
    setIsVerifying(false);
  };

  const handleLogout = async () => {
    await ageWallet.clearVerification();
    setIsVerified(false);
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
      <View style={styles.content}>
        <Text style={styles.title}>AgeWallet SDK Demo</Text>

        {isVerified ? (
          // Verified State
          <View style={styles.card}>
            <Text style={styles.verifiedIcon}>✓</Text>
            <Text style={styles.verifiedText}>Age Verified</Text>
            <Text style={styles.description}>
              You have been verified and can access age-restricted content.
            </Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Clear Verification</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Unverified State - Age Gate
          <View style={styles.card}>
            <Text style={styles.gateIcon}>🔒</Text>
            <Text style={styles.gateTitle}>Age Verification Required</Text>
            <Text style={styles.description}>
              This content is age-restricted. Please verify your age to continue.
            </Text>
            <TouchableOpacity
              style={[styles.verifyButton, isVerifying && styles.buttonDisabled]}
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
      </View>

      <Text style={styles.footer}>
        This is a demo app for the AgeWallet React Native SDK.
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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#1f2937',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  verifyButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  verifiedIcon: {
    fontSize: 48,
    color: '#10b981',
    marginBottom: 16,
  },
  verifiedText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  footer: {
    textAlign: 'center',
    padding: 20,
    color: '#9ca3af',
    fontSize: 14,
  },
  debugPanel: {
    backgroundColor: '#111',
    maxHeight: 140,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  debugLine: {
    color: '#0f0',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});
