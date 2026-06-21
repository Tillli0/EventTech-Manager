import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "de.eventtech.manager",
  appName: "EventTech Manager",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    Camera: {
      // Wird vom Barcode-Scanner über react-zxing/MediaDevices genutzt;
      // diese Berechtigung wird zur Laufzeit angefragt.
    },
  },
};

export default config;
