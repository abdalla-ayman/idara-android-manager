# ADB Binaries

Place platform-specific ADB binaries here:

## Structure
```
adb/
├── windows/
│   ├── adb.exe
│   ├── AdbWinApi.dll
│   └── AdbWinUsbApi.dll
├── macos/
│   └── adb
└── linux/
    └── adb
```

## Download
Download the latest platform tools from:
https://developer.android.com/tools/releases/platform-tools

Extract and place the `adb` binary (and required DLLs for Windows) into the appropriate platform folder.

## Note
- On macOS/Linux, make sure `adb` is executable: `chmod +x adb`
- The app will first check if ADB is available in the system PATH before using the bundled version
