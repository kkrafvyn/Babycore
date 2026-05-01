package com.babylog.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class BabyLogWidgetProvider extends AppWidgetProvider {

    private PendingIntent buildViewIntent(Context context, int requestCode, String url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.babylog_widget);
            views.setOnClickPendingIntent(
                R.id.widget_action_feed,
                buildViewIntent(context, 101, "com.babylog.app://open/feeding?source=widget")
            );
            views.setOnClickPendingIntent(
                R.id.widget_action_sleep,
                buildViewIntent(context, 102, "com.babylog.app://open/sleep?source=widget")
            );
            views.setOnClickPendingIntent(
                R.id.widget_action_diaper,
                buildViewIntent(context, 103, "com.babylog.app://open/diaper?source=widget")
            );
            views.setOnClickPendingIntent(
                R.id.widget_action_emergency,
                buildViewIntent(context, 104, "com.babylog.app://open/emergency-card?source=widget")
            );
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
