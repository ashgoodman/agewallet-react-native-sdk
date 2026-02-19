package io.agewallet.sdk.demo.reactnative

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Dedicated callback activity for the OIDC redirect URL.
 *
 * Chrome Custom Tab dismisses itself when an intent:// link targets the host
 * app's singleTask MainActivity — it does NOT call onNewIntent() on the existing
 * activity. By giving the HTTPS callback URL its own separate activity, Android
 * fires a fresh onCreate() with the full URL in intent.data instead.
 *
 * The URL is stored in a static companion field so JS can poll for it via the
 * AgeWalletCallbackModule native module, then it brings MainActivity to front.
 */
class AgeWalletCallbackActivity : Activity() {

    companion object {
        @Volatile
        var pendingCallbackUrl: String? = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = intent?.data?.toString()
        android.util.Log.d("AWCallback", "AgeWalletCallbackActivity.onCreate url=$url action=${intent?.action}")

        if (url != null) {
            pendingCallbackUrl = url
        }

        startActivity(
            Intent(this, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
            }
        )

        finish()
    }
}
