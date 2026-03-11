package io.github.beutelfuchs.foodlog;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    private volatile String pendingSharePath = null;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleSendIntent(intent);
    }

    private void handleSendIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null && type.startsWith("image/")) {
            Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (imageUri != null) {
                try {
                    InputStream inputStream = getContentResolver().openInputStream(imageUri);
                    if (inputStream != null) {
                        File cacheDir = getCacheDir();
                        File sharedFile = new File(cacheDir, "shared_image.jpg");
                        FileOutputStream fos = new FileOutputStream(sharedFile);
                        byte[] buffer = new byte[4096];
                        int n;
                        while ((n = inputStream.read(buffer)) != -1) {
                            fos.write(buffer, 0, n);
                        }
                        fos.close();
                        inputStream.close();

                        pendingSharePath = sharedFile.getAbsolutePath();
                        // Clear the intent so it doesn't re-trigger
                        intent.setAction(null);
                        tryInject(0);
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    private void tryInject(int attempt) {
        // Already consumed
        if (pendingSharePath == null || attempt > 8) return;

        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                String filePath = pendingSharePath;
                String js = "if(window.__handleSharedImage){" +
                    "window.__handleSharedImage('" + filePath + "');" +
                    "}else{" +
                    "window.__pendingSharePath='" + filePath + "';" +
                    "}";

                getBridge().getWebView().post(() -> {
                    getBridge().getWebView().evaluateJavascript(
                        "typeof window.__handleSharedImage === 'function'",
                        result -> {
                            if ("true".equals(result)) {
                                // App is ready — inject once and clear
                                pendingSharePath = null;
                                getBridge().getWebView().evaluateJavascript(
                                    "window.__handleSharedImage('" + filePath + "');",
                                    null
                                );
                            } else {
                                // App not ready yet — set pending and retry
                                getBridge().getWebView().evaluateJavascript(
                                    "window.__pendingSharePath='" + filePath + "';",
                                    null
                                );
                                handler.postDelayed(() -> tryInject(attempt + 1), 500);
                            }
                        }
                    );
                });
            } else {
                handler.postDelayed(() -> tryInject(attempt + 1), 500);
            }
        } catch (Exception e) {
            handler.postDelayed(() -> tryInject(attempt + 1), 500);
        }
    }
}
