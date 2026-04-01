package com.zentrumtvde.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "IncomingCall",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_PHONE_STATE }, alias = IncomingCallPlugin.READ_PHONE_STATE),
        @Permission(strings = { Manifest.permission.READ_CALL_LOG }, alias = IncomingCallPlugin.READ_CALL_LOG)
    }
)
public class IncomingCallPlugin extends Plugin {

    static final String READ_PHONE_STATE = "readPhoneState";
    static final String READ_CALL_LOG = "readCallLog";
    private static final String CHANNEL_ID = "incoming-calls";
    private static final String CHANNEL_NAME = "Chamadas recebidas";
    private static final String EXTRA_ROUTE = "incoming_call_route";
    private static final String EXTRA_PHONE = "incoming_call_phone";

    private TelephonyManager telephonyManager;
    private PhoneStateListener phoneStateListener;
    private boolean isListening = false;
    private static JSObject pendingLaunchPayload;

    @Override
    public void load() {
        telephonyManager = (TelephonyManager) getContext().getSystemService(Context.TELEPHONY_SERVICE);
        ensureNotificationChannel();
        phoneStateListener = new PhoneStateListener() {
            @Override
            public void onCallStateChanged(int state, String phoneNumber) {
                super.onCallStateChanged(state, phoneNumber);
                emitCallState(state, phoneNumber);
            }
        };

        handleIncomingIntent(getActivity().getIntent());
    }

    @Override
    protected void handleOnDestroy() {
        stopListening();
        super.handleOnDestroy();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject permissions = new JSObject();
        permissions.put(READ_PHONE_STATE, getPermissionState(READ_PHONE_STATE).toString().toLowerCase());
        permissions.put(READ_CALL_LOG, getPermissionState(READ_CALL_LOG).toString().toLowerCase());
        call.resolve(permissions);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        requestAllPermissions(call, "permissionsCallback");
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (telephonyManager == null || phoneStateListener == null) {
            call.reject("Telephony manager unavailable.");
            return;
        }

        if (
            getPermissionState(READ_PHONE_STATE) != PermissionState.GRANTED ||
            getPermissionState(READ_CALL_LOG) != PermissionState.GRANTED
        ) {
            call.reject("Required phone permissions are not granted.");
            return;
        }

        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
        isListening = true;
        call.resolve();
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        stopListening();
        call.resolve();
    }

    @PluginMethod
    public void getPendingLaunchPayload(PluginCall call) {
        JSObject payload = pendingLaunchPayload;
        pendingLaunchPayload = null;
        call.resolve(payload != null ? payload : new JSObject());
    }

    private void stopListening() {
        if (!isListening || telephonyManager == null || phoneStateListener == null) {
            return;
        }

        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);
        isListening = false;
    }

    private void emitCallState(int state, String phoneNumber) {
        JSObject payload = new JSObject();
        String mappedState = mapState(state);
        String normalizedPhoneNumber = phoneNumber != null ? phoneNumber : "";

        payload.put("state", mappedState);
        payload.put("phoneNumber", normalizedPhoneNumber);
        payload.put("receivedAt", System.currentTimeMillis());

        if ("ringing".equals(mappedState) && (bridge == null || !bridge.getApp().isActive())) {
            showIncomingCallNotification(normalizedPhoneNumber);
        }

        notifyListeners("incomingCall", payload, true);
    }

    private String mapState(int state) {
        if (state == TelephonyManager.CALL_STATE_RINGING) {
            return "ringing";
        }

        if (state == TelephonyManager.CALL_STATE_OFFHOOK) {
            return "offhook";
        }

        return "idle";
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        handleIncomingIntent(intent);
    }

    private void handleIncomingIntent(Intent intent) {
        if (intent == null || !intent.hasExtra(EXTRA_PHONE)) {
            return;
        }

        JSObject payload = new JSObject();
        payload.put("state", "ringing");
        payload.put("phoneNumber", intent.getStringExtra(EXTRA_PHONE));
        payload.put("route", intent.getStringExtra(EXTRA_ROUTE));
        payload.put("receivedAt", System.currentTimeMillis());

        pendingLaunchPayload = payload;
        notifyListeners("incomingCallTap", payload, true);

        intent.removeExtra(EXTRA_PHONE);
        intent.removeExtra(EXTRA_ROUTE);
    }

    private void ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager notificationManager = getContext().getSystemService(NotificationManager.class);

        if (notificationManager == null || notificationManager.getNotificationChannel(CHANNEL_ID) != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Alertas para abrir a task correspondente a uma chamada recebida.");
        channel.enableVibration(true);
        notificationManager.createNotificationChannel(channel);
    }

    private void showIncomingCallNotification(String phoneNumber) {
        NotificationManager notificationManager = getContext().getSystemService(NotificationManager.class);

        if (notificationManager == null) {
            return;
        }

        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.putExtra(EXTRA_PHONE, phoneNumber);
        intent.putExtra(EXTRA_ROUTE, "/reserved/tasks?incoming_phone=" + phoneNumber);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            getContext(),
            (int) (System.currentTimeMillis() % Integer.MAX_VALUE),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Chamada recebida")
            .setContentText(phoneNumber.isEmpty() ? "Toque para localizar a task." : phoneNumber)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        notificationManager.notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), builder.build());
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        checkPermissions(call);
    }
}
