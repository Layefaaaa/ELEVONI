# Elevoni Farms — Capacitor Android and iOS packaging

## Splash artwork

The provided `src/assets/Home-image.jpeg` is preserved as the source artwork. A square, sage-background splash source for Capacitor's asset generator is at `assets/splash.png` (2732 × 2732). The splash screen is a brief native launch screen; it is not a replacement for the React home page. Android 12 and later may display a system-controlled splash treatment, so the exact full-image composition can vary by OS version.

## Requirements

- A supported Node.js LTS release and npm.
- Android: Android Studio, Android SDK, and a configured JDK (Java 21 is installed in the current build environment, but Android Studio/SDK are not).
- iOS: macOS and Xcode. iOS native projects cannot be built or signed on Windows/Linux.

## Generate Android project (run from `frontend/`)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/splash-screen
npm install -D @capacitor/assets
npx cap assets
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

If `android/` already exists, skip `npx cap add android` and run `npx cap sync android` instead. In Android Studio, allow Gradle sync to finish, then run on an emulator or connected Android phone. The `com.elevoni.farms` application ID is a proposed identifier; confirm it before publishing because changing it later affects store identity.

## Generate iOS project (run from `frontend/` on a Mac)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/splash-screen
npm install -D @capacitor/assets
npx cap assets
npm run build
npx cap add ios
npx cap sync ios
npx cap open ios
```

If `ios/` already exists, skip `npx cap add ios`. In Xcode, set the signing team and bundle identifier, then test on a real device before archiving. App Store submission also requires Apple developer account access and signing.

## Update after web changes

```bash
npm run build
npx cap sync
```

## Important limitations

- Native projects are generated locally by the commands above; merely having `capacitor.config.json` does not mean an Android/iOS project already exists.
- The current execution environment could not resolve `registry.npmjs.org` when tested, so package installation and native project generation could not be completed here. Run the commands on a computer with working npm access.
- Test account login, product browsing, ordering, Paystack checkout/verification, WhatsApp links, and deep links on devices. Live products, accounts, orders and payments require internet.
- Do not commit signing keys, `.env` files, or store credentials.
