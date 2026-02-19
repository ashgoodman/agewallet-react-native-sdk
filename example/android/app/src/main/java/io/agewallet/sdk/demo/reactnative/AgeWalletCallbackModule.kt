package io.agewallet.sdk.demo.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Exposes the OIDC callback URL captured by AgeWalletCallbackActivity to JS.
 * JS polls getAndClear() every ~500ms while waiting for the OIDC redirect.
 */
class AgeWalletCallbackModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AgeWalletCallback"

    @ReactMethod
    fun getAndClear(promise: Promise) {
        val url = AgeWalletCallbackActivity.pendingCallbackUrl
        AgeWalletCallbackActivity.pendingCallbackUrl = null
        promise.resolve(url)
    }
}
