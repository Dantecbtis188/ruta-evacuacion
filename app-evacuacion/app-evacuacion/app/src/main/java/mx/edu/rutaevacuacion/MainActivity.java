package mx.edu.rutaevacuacion;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * Única pantalla de la app: abre la página que está guardada dentro de la aplicación
 * (app/src/main/assets/index.html). No necesita internet.
 */
public class MainActivity extends Activity {

    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);   // la animación necesita JavaScript

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }
}
