<div align="center">
  <img src="public/icon.png" width="96" alt="إدارة" />
  <h1>إدارة — Android Manager</h1>
  <p>A desktop app to safely <b>uninstall</b>, <b>disable</b>, and <b>restore</b> system apps on your Android device over ADB — no root required.</p>
</div>

---

## Features

- 🔌 **Device-aware** — auto-detects connected devices, shows model / Android version, and supports switching between multiple devices.
- 📦 **Smart app list** — system vs. user apps, disabled state, friendly names for hundreds of common packages, search, and filter tabs.
- 🗑️ **Reversible uninstall** — removes apps for the current user (`pm uninstall -k --user 0`) so they can always be brought back with `install-existing`.
- 🚫 **Disable / enable** — a lighter, instantly reversible alternative to uninstalling.
- ⏳ **Recovery password & time-lock** — optionally protect restoration behind a password and a configurable wait period (anti-impulse safeguard).
- 🌍 **Bilingual** — full English / العربية support with right-to-left layout.
- 🎨 Polished, animated desktop UI (custom title bar, glassmorphism, dark "cyber-violet" theme).

## How uninstalling works (and why it's safe)

إدارة never deletes the APK from the device. It uninstalls the package **for user 0 only**:

```
adb shell pm uninstall -k --user 0 <package>      # remove (keep data)
adb shell cmd package install-existing <package>   # restore
```

Because the system image still contains the app, restoration is reliable. A factory reset also brings everything back.

> ⚠️ Removing core system packages (e.g. `com.google.android.gms`, `com.android.systemui`) can cause instability. إدارة lets you manage them, but you should know what a package does before removing it.

## Prerequisites

- **Node.js** 18+
- **ADB** — either on your `PATH` (install Android *platform-tools*) or dropped into [`adb/<platform>/`](adb/README.md). إدارة prefers a bundled binary, then falls back to `PATH`.
- On the phone: **Developer Options → USB debugging** enabled, and **Allow** the authorization prompt.

## Development

```bash
npm install
npm run dev:electron   # Vite dev server + Electron
# or just the web UI (uses a mock ADB layer, no device needed):
npm run dev
```

## Build

```bash
npm run build:linux    # AppImage + deb + rpm + tar.gz
npm run build:windows  # NSIS installer + zip
npm run build:macos    # dmg + zip
npm run build:all      # all platforms
```

Artifacts are written to `release/`.

## Tech stack

React 19 · Vite · Electron · framer-motion · i18next · electron-store

## Project layout

```
electron/      Main process, IPC, ADB bridge, package-label dictionary
src/pages/     LanguageSelect · USBSetup · AppList · RestoreApps · Settings
src/components/ TitleBar · Sidebar · Toast · ConfirmDialog
src/i18n/      en / ar locale files
adb/           Optional bundled adb binaries per platform
```

## Repository

[github.com/abdalla-ayman/idara-android-manager](https://github.com/abdalla-ayman/idara-android-manager)

## License

MIT
