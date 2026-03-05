# Android App Build Guide

This project has been converted to an Android App using [Capacitor](https://capacitorjs.com/).

## Prerequisites
- Node.js (Installed)
- Android Studio (Required for building the final APK/AAB)

## How to Run

1. **Build the Web Asset**
   Any time you make changes to the HTML/JS/CSS, you must rebuild the web project:
   ```bash
   npm run build
   ```

2. **Sync with Android Project**
   Copy the latest build to the Android native project:
   ```bash
   npx cap sync
   ```

3. **Open in Android Studio**
   Open the native project to run it on a simulator or device:
   ```bash
   npx cap open android
   ```
   Alternatively, launch Android Studio and open the `android` folder inside this project.

## Troubleshooting
- If you see a blank white screen, ensure `vite.config.js` has `base: './'` (already configured).
- If dependencies are missing, run `npm install`.

## Building APK
In Android Studio:
1. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
2. The APK will be generated in `android/app/build/outputs/apk/debug/`.
