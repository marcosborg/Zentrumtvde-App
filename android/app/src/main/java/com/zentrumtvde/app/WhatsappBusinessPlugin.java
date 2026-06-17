package com.zentrumtvde.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

@CapacitorPlugin(name = "WhatsappBusiness")
public class WhatsappBusinessPlugin extends Plugin {

    private static final String WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b";

    @PluginMethod
    public void open(PluginCall call) {
        String phone = call.getString("phone", "");
        String text = call.getString("text", "");

        if (phone == null || phone.trim().isEmpty()) {
            call.reject("Telefone em falta.");
            return;
        }

        String encodedText = "";
        try {
            encodedText = URLEncoder.encode(text != null ? text : "", "UTF-8");
        } catch (UnsupportedEncodingException ignored) {
            encodedText = "";
        }

        Uri uri = Uri.parse("whatsapp://send?phone=" + phone.trim() + "&text=" + encodedText);
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.setPackage(WHATSAPP_BUSINESS_PACKAGE);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (ActivityNotFoundException exception) {
            call.reject("WhatsApp Business nao esta instalado.");
        } catch (Exception exception) {
            call.reject("Nao foi possivel abrir o WhatsApp Business.");
        }
    }
}
