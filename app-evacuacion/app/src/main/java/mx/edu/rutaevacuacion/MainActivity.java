package mx.edu.rutaevacuacion;

import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

/** Pantalla offline de evacuación; recibe el punto de inicio desde los QR del plantel. */
public class MainActivity extends Activity {
    private WebView web;
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        inicializarVoz();
        crearWebView();
        cargarPunto(getIntent() == null ? null : getIntent().getDataString());
    }

    private void inicializarVoz() {
        textToSpeech = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int result = textToSpeech.setLanguage(new Locale("es", "MX"));
                ttsReady = result != TextToSpeech.LANG_MISSING_DATA
                        && result != TextToSpeech.LANG_NOT_SUPPORTED;
            }
        });
    }

    private void crearWebView() {
        web = new WebView(this);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new VoiceBridge(), "AndroidVoice");
        setContentView(web);
    }

    private void cargarPunto(String uri) {
        String punto = "";
        if (uri != null) {
            android.net.Uri parsed = android.net.Uri.parse(uri);
            String candidate = parsed.getQueryParameter("punto");
            if (candidate == null) candidate = parsed.getQueryParameter("qr");
            if (candidate != null && candidate.matches("[a-z0-9-]{1,40}")) {
                punto = candidate;
            }
        }
        web.loadUrl("file:///android_asset/index.html?punto="
                + android.net.Uri.encode(punto));
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        cargarPunto(intent == null ? null : intent.getDataString());
    }

    private final class VoiceBridge {
        @JavascriptInterface
        public void speak(String text) {
            if (text == null || text.isEmpty()) return;
            runOnUiThread(() -> {
                if (ttsReady && textToSpeech != null) {
                    textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "evacuation-guidance");
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidVoice");
            web.destroy();
        }
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        super.onDestroy();
    }
}
