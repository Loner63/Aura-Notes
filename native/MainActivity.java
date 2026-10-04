package com.loner63.auranotes;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AuraSavePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
