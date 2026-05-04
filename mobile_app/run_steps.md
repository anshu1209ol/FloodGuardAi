# How to Run the FloodGuard Mobile App

This document outlines the steps required to run the FloodGuard Mobile App locally on your machine.

## Prerequisites
- **Node.js** and **npm** must be installed.
- **Expo CLI** (Optional, but recommended. Expo commands can be run via `npx`).
- **Expo Go App** on your mobile device (iOS/Android) or an Android Emulator/iOS Simulator configured on your machine.

## Steps to Run

1. **Open a Terminal**
   Navigate to the mobile app directory:
   ```bash
   cd "c:\Users\anshu\Documents\Codes\Flood detection\mobile_app"
   ```

2. **Install Dependencies**
   If this is your first time running the app or if dependencies have changed, run:
   ```bash
   npm install
   ```

3. **Start the Development Server**
   Start the Expo Metro Bundler by running:
   ```bash
   npm start
   ```
   *(Alternatively, you can run `npx expo start`)*

4. **Run the App on a Device or Emulator**
   Once the Metro Bundler has started, it will display a QR code in the terminal.
   
   - **For Physical Devices:** Open the **Expo Go** app on your phone and scan the QR code (using the Camera app on iOS or from within Expo Go on Android).
   - **For Android Emulator:** Press `a` in the terminal to open the app on a connected Android device or emulator.
   - **For iOS Simulator (Mac only):** Press `i` in the terminal to open the app in the iOS Simulator.

## Troubleshooting
- If you encounter network issues (e.g., your phone cannot connect to the bundler), ensure that your phone and your computer are on the **same Wi-Fi network**.
- You can force Expo to use an alternate connection type (e.g., Tunnel) if local LAN connection fails. Press `shift + t` or start the app with `npx expo start --tunnel`.
