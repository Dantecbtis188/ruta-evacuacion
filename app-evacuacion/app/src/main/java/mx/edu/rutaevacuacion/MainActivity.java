package mx.edu.rutaevacuacion;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

/**
 * Única pantalla de la app. Todo es automático:
 *  - Se abre con el enlace del QR de un cartel (https://dantecbtis188.github.io/ruta-evacuacion/?c=cartel-5
 *    o cbtis188://cartel/cartel-5) y abre la página guardada en la app (assets/index.html) con ese cartel.
 *  - La página calcula la ruta y la dice en voz alta. La voz y la vibración las hace el propio Android
 *    (TextToSpeech y Vibrator) porque el WebView no deja hablar ni vibrar sin que se toque la pantalla.
 *  - "Llamar al 911" abre el marcador del teléfono.
 * No pide cámara: el QR se escanea con la cámara normal del celular.
 */
public class MainActivity extends Activity {

    private WebView web;
    private TextToSpeech tts;
    private boolean ttsListo = false;
    private SensorManager sensores;
    private long ultimoDato = 0;
    private String pendiente = null;      // texto que llegó antes de que la voz estuviera lista

    /** Lo que la página puede pedirle al teléfono (se llama desde JavaScript como AndroidVoz.hablar(...)). */
    public class Voz {
        @JavascriptInterface
        public void hablar(final String texto, final boolean lenta) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (!ttsListo) { pendiente = texto; return; }
                    tts.setSpeechRate(lenta ? 0.75f : 1.0f);
                    tts.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "ruta");
                }
            });
        }

        /** patron = lista JSON de milisegundos: [espera, vibra, pausa, vibra...] */
        @JavascriptInterface
        public void vibrar(String patronJson) {
            try {
                String[] partes = patronJson.replace("[", "").replace("]", "").split(",");
                long[] patron = new long[partes.length];
                for (int i = 0; i < partes.length; i++) patron[i] = Long.parseLong(partes[i].trim());
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null) v.vibrate(VibrationEffect.createWaveform(patron, -1));
            } catch (Exception e) {
                // si algo sale mal, simplemente no vibra
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int estado) {
                if (estado == TextToSpeech.SUCCESS) {
                    int r = tts.setLanguage(new Locale("es", "MX"));
                    if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                        tts.setLanguage(new Locale("es"));
                    }
                    ttsListo = true;
                    if (pendiente != null) {
                        tts.speak(pendiente, TextToSpeech.QUEUE_FLUSH, null, "ruta");
                        pendiente = null;
                    }
                }
            }
        });

        web = new WebView(this);
        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);                 // la app es una página con JavaScript
        ajustes.setDomStorageEnabled(true);
        web.addJavascriptInterface(new Voz(), "AndroidVoz");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("tel:")) {
                    try {
                        startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse(url)));
                    } catch (ActivityNotFoundException e) {
                        // el teléfono no tiene marcador: no pasa nada
                    }
                    return true;
                }
                return false;
            }
        });

        setContentView(web);
        web.loadUrl(direccionInicial(getIntent()));
    }

    /** Si la app se abrió desde un QR, trae el cartel; si no, abre la pantalla de inicio. */
    private String direccionInicial(Intent intento) {
        String base = "file:///android_asset/index.html";
        String cartel = cartelDe(intento);
        return cartel == null ? base : base + "#" + Uri.encode(cartel);
    }

    /** Saca el nombre del cartel de un enlace (?c=cartel-5, ?p=cartel-5 o cbtis188://cartel/cartel-5). */
    private String cartelDe(Intent intento) {
        if (intento == null || intento.getData() == null) return null;
        Uri u = intento.getData();
        String id = u.getQueryParameter("c");
        if (id == null) id = u.getQueryParameter("p");
        if (id == null && "cbtis188".equals(u.getScheme())) id = u.getLastPathSegment();
        return (id == null || id.length() == 0) ? null : id;
    }

    /** La app ya estaba abierta y escanean otro cartel: se cambia el cartel sin reiniciar. */
    @Override
    protected void onNewIntent(Intent intento) {
        super.onNewIntent(intento);
        setIntent(intento);
        String cartel = cartelDe(intento);
        if (cartel != null && web != null) {
            web.loadUrl("file:///android_asset/index.html#" + Uri.encode(cartel));
        }
    }

    /** El acelerómetro del teléfono (sirve para contar pasos). Se lo pasa a la página; no necesita permiso. */
    private final SensorEventListener escuchaAcelerometro = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent e) {
            long ahora = System.currentTimeMillis();
            if (web == null || ahora - ultimoDato < 25) return;      // máximo unas 40 lecturas por segundo
            ultimoDato = ahora;
            web.evaluateJavascript("window.__acc&&window.__acc(" + e.values[0] + "," + e.values[1] + "," + e.values[2] + "," + ahora + ")", null);
        }

        @Override
        public void onAccuracyChanged(Sensor sensor, int precision) { }
    };

    @Override
    protected void onResume() {
        super.onResume();
        sensores = (SensorManager) getSystemService(SENSOR_SERVICE);
        if (sensores != null) {
            Sensor acc = sensores.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
            if (acc != null) sensores.registerListener(escuchaAcelerometro, acc, SensorManager.SENSOR_DELAY_GAME);
        }
    }

    @Override
    protected void onPause() {
        if (sensores != null) sensores.unregisterListener(escuchaAcelerometro);
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }
}
