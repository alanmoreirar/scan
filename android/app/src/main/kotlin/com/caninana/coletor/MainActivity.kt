package com.caninana.coletor

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import android.view.WindowManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.webkit.WebViewAssetLoader

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val CAMERA_PERMISSION_REQUEST = 100
    private var permissionRequest: PermissionRequest? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Full screen immersive
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Initialize WebViewAssetLoader to host assets on a virtual https:// domain.
        // This solves ES Modules (type="module") failing to load over file:// protocol in WebView.
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = false // Keep false for security, handled by AssetLoader
            settings.allowContentAccess = false
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.setSupportZoom(false)
            settings.builtInZoomControls = false
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true

            webViewClient = object : WebViewClient() {
                // Intercept web requests and route them through the asset loader
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    return request?.let { assetLoader.shouldInterceptRequest(it.url) }
                }

                @Deprecated("Deprecated in Java")
                override fun shouldInterceptRequest(
                    view: WebView?,
                    url: String?
                ): WebResourceResponse? {
                    return url?.let { assetLoader.shouldInterceptRequest(Uri.parse(it)) }
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    // Log or handle error if loading fails
                }
            }

            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest?) {
                    request?.let {
                        val resources = it.resources
                        if (resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                            if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                                it.grant(resources)
                            } else {
                                permissionRequest = it
                                ActivityCompat.requestPermissions(
                                    this@MainActivity,
                                    arrayOf(Manifest.permission.CAMERA),
                                    CAMERA_PERMISSION_REQUEST
                                )
                            }
                        } else {
                            it.grant(resources)
                        }
                    }
                }
            }
        }

        setContentView(webView)

        // Load via the virtual WebViewAssetLoader domain
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                permissionRequest?.grant(permissionRequest?.resources)
                Toast.makeText(this, "Câmera autorizada para leitura de código de barras", Toast.LENGTH_SHORT).show()
            } else {
                permissionRequest?.deny()
                Toast.makeText(this, "Permissão de câmera negada", Toast.LENGTH_SHORT).show()
            }
            permissionRequest = null
        }
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
