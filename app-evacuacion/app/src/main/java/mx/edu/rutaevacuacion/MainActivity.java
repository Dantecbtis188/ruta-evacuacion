package mx.edu.rutaevacuacion;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Única pantalla de la app: abre la página guardada dentro de la aplicación
 * (app/src/main/assets/index.html). No necesita internet.
 *
 * Además hace dos cosas que la página no puede hacer sola:
 *  1) Le permite usar la cámara (para leer el QR del cartel), pidiendo el permiso al usuario.
 *  2) Abre el marcador del teléfono cuando se toca "Llamar al 911".
 */
public class MainActivity extends Activity {

    private static final int PEDIR_CAMARA = 10;

    private WebView web;
    private PermissionRequest pendiente;   // solicitud de cámara de la página, mientras el usuario decide

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);                 // la app es una página con JavaScript
        ajustes.setDomStorageEnabled(true);                 // para recordar los ajustes (letra grande, etc.)
        ajustes.setMediaPlaybackRequiresUserGesture(false); // para que la cámara se vea sin tocar otra vez

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

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        boolean pideCamara = false;
                        for (String r : request.getResources()) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) pideCamara = true;
                        }
                        if (!pideCamara) {
                            request.deny();
                            return;
                        }
                        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                        } else {
                            pendiente = request;
                            requestPermissions(new String[]{Manifest.permission.CAMERA}, PEDIR_CAMARA);
                        }
                    }
                });
            }
        });

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int codigo, String[] permisos, int[] resultados) {
        super.onRequestPermissionsResult(codigo, permisos, resultados);
        if (codigo == PEDIR_CAMARA && pendiente != null) {
            if (resultados.length > 0 && resultados[0] == PackageManager.PERMISSION_GRANTED) {
                pendiente.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else {
                pendiente.deny();
            }
            pendiente = null;
        }
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
        if (web != null) {
            web.destroy();
        }
        super.onDestroy();
    }
}
