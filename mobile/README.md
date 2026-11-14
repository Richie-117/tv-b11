# TV B11 — Native Android Mobile Application
**Division of Television Studies · University College of Ratmalana · Batch 11**

This folder contains the dedicated, isolated Android mobile wrapper for the **TV B11 Portal**.

---

## 🚀 Key Mobile Features

1. **Real-time Synchronized Web & Mobile**:
   - The mobile application connects live to `https://tv-b11.onrender.com`.
   - Any attendance check-in, marks change, or announcement made in the web app or mobile app reflects everywhere instantly.
2. **Native Android Capabilities**:
   - **Logo**: Branded with official `ucrtv.png` across all icon densities (`mipmap-mdpi` through `mipmap-xxxhdpi`).
   - **App Name**: `TV B11`.
   - **Hardware Acceleration**: High-frame-rate smooth scrolling and transitions.
   - **Pull to Refresh**: Native `SwipeRefreshLayout` with UCR Orange accent color.
   - **File Upload / Camera**: HTML5 file inputs support taking photos directly with the device camera or choosing documents from device storage.
   - **Download Manager**: Official PDF rosters and Excel attendance exports download directly into the Android `Downloads` directory.
   - **Offline Resilience**: Displays a branded reconnect screen with auto-retry when connectivity drops.
   - **Session Persistence**: Cookies are saved securely so students and admins stay logged in.

---

## 📦 How to Build the APK

### Option 1: Automatic Cloud Build via GitHub Actions (Recommended)
1. Push your code to GitHub `main` branch.
2. In your GitHub repository, open the **Actions** tab.
3. Select **Build Android APK (TV B11)**.
4. When the build finishes (~1-2 minutes), download the ready-to-install **`TV-B11.apk`** under the **Artifacts** or **Releases** section.
5. Transfer or download the APK to any Android phone (Android 7.0+) and tap **Install**.

### Option 2: Open in Android Studio
1. Open Android Studio.
2. Click **Open an existing project** and choose:
   `D:\UCR-Portal-New\mobile\android`
3. Let Gradle sync.
4. Click **Build** $\rightarrow$ **Build Bundle(s) / APK(s)** $\rightarrow$ **Build APK(s)**.
5. The generated APK will be located in:
   `mobile/android/app/build/outputs/apk/debug/app-debug.apk`

### Option 3: Command Line (Gradle)
```bash
cd mobile/android
./gradlew assembleDebug
```
The compiled APK is output to `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
