// ─────────────────────────────────────────────────────────────
//  Package → friendly label dictionary
//
//  Resolving real on-device labels would require a `dumpsys package`
//  call per package (hundreds of slow ADB round-trips). Instead we
//  keep a curated map of the packages people most commonly want to
//  manage, and fall back to a smart formatter for everything else.
// ─────────────────────────────────────────────────────────────

const KNOWN_LABELS = {
  // ── Google ──
  'com.google.android.gms': 'Google Play Services',
  'com.google.android.gsf': 'Google Services Framework',
  'com.android.vending': 'Google Play Store',
  'com.google.android.gm': 'Gmail',
  'com.google.android.apps.maps': 'Google Maps',
  'com.google.android.youtube': 'YouTube',
  'com.google.android.apps.youtube.music': 'YouTube Music',
  'com.google.android.music': 'Google Play Music',
  'com.google.android.videos': 'Google TV',
  'com.google.android.apps.photos': 'Google Photos',
  'com.google.android.calendar': 'Google Calendar',
  'com.google.android.deskclock': 'Google Clock',
  'com.google.android.apps.docs': 'Google Drive',
  'com.google.android.apps.docs.editors.docs': 'Google Docs',
  'com.google.android.apps.docs.editors.sheets': 'Google Sheets',
  'com.google.android.apps.docs.editors.slides': 'Google Slides',
  'com.google.android.keep': 'Google Keep',
  'com.google.android.apps.messaging': 'Messages',
  'com.google.android.contacts': 'Contacts',
  'com.google.android.dialer': 'Phone',
  'com.google.android.googlequicksearchbox': 'Google',
  'com.google.android.apps.translate': 'Google Translate',
  'com.google.android.apps.nbu.files': 'Files by Google',
  'com.google.android.apps.wellbeing': 'Digital Wellbeing',
  'com.google.android.apps.tachyon': 'Google Meet',
  'com.google.android.apps.subscriptions.red': 'Google One',
  'com.google.android.apps.podcasts': 'Google Podcasts',
  'com.google.android.apps.magazines': 'Google News',
  'com.google.android.apps.books': 'Google Play Books',
  'com.google.android.feedback': 'Google Feedback',
  'com.google.android.printservice.recommendation': 'Print Service',
  'com.google.android.tts': 'Speech Services',
  'com.google.android.webview': 'Android System WebView',
  'com.google.ar.core': 'Google Play Services for AR',
  'com.google.android.projection.gearhead': 'Android Auto',
  'com.google.android.markup': 'Markup',
  'com.google.android.apps.wallpaper': 'Wallpapers',
  'com.google.android.apps.maps.lite': 'Google Maps Go',
  'com.android.chrome': 'Chrome',

  // ── Samsung ──
  'com.samsung.android.app.notes': 'Samsung Notes',
  'com.samsung.android.calendar': 'Samsung Calendar',
  'com.samsung.android.email.provider': 'Samsung Email',
  'com.samsung.android.messaging': 'Samsung Messages',
  'com.samsung.android.dialer': 'Samsung Phone',
  'com.samsung.android.contacts': 'Samsung Contacts',
  'com.sec.android.app.camera': 'Samsung Camera',
  'com.sec.android.gallery3d': 'Samsung Gallery',
  'com.sec.android.app.myfiles': 'My Files',
  'com.samsung.android.scloud': 'Samsung Cloud',
  'com.samsung.android.bixby.agent': 'Bixby',
  'com.samsung.android.bixby.wakeup': 'Bixby Voice Wake-up',
  'com.samsung.android.app.spage': 'Samsung Free',
  'com.samsung.android.game.gamehome': 'Game Launcher',
  'com.samsung.android.game.gametools': 'Game Booster',
  'com.samsung.android.lool': 'Device Care',
  'com.samsung.android.themestore': 'Galaxy Themes',
  'com.sec.android.app.samsungapps': 'Galaxy Store',
  'com.samsung.android.spay': 'Samsung Wallet',
  'com.samsung.android.kidsinstaller': 'Samsung Kids',
  'com.samsung.android.app.tips': 'Samsung Tips',
  'com.samsung.android.voc': 'Samsung Members',
  'com.samsung.android.arzone': 'AR Zone',
  'com.samsung.android.aremoji': 'AR Emoji',
  'com.samsung.android.app.watchmanager': 'Galaxy Wearable',
  'com.samsung.android.oneconnect': 'SmartThings',
  'com.samsung.android.smartmirroring': 'Smart View',
  'com.samsung.android.mdx': 'Link to Windows Service',

  // ── Xiaomi / MIUI ──
  'com.miui.gallery': 'Gallery',
  'com.miui.player': 'Mi Music',
  'com.miui.videoplayer': 'Mi Video',
  'com.miui.cleanmaster': 'Cleaner',
  'com.miui.securitycenter': 'Security',
  'com.miui.weather2': 'Weather',
  'com.miui.notes': 'Notes',
  'com.miui.calculator': 'Calculator',
  'com.xiaomi.market': 'GetApps',
  'com.xiaomi.mipicks': 'GetApps',
  'com.miui.android.fashiongallery': 'Glance Wallpaper',
  'com.mi.android.globalminusscreen': 'App Vault',
  'com.miui.msa.global': 'MSA (Ad Services)',
  'com.android.browser': 'Browser',

  // ── Microsoft ──
  'com.microsoft.office.outlook': 'Outlook',
  'com.microsoft.office.officehubrow': 'Microsoft 365',
  'com.microsoft.skydrive': 'OneDrive',
  'com.skype.raider': 'Skype',
  'com.microsoft.appmanager': 'Link to Windows',
  'com.linkedin.android': 'LinkedIn',

  // ── Meta / Facebook ──
  'com.facebook.katana': 'Facebook',
  'com.facebook.system': 'Facebook App Installer',
  'com.facebook.appmanager': 'Facebook App Manager',
  'com.facebook.services': 'Facebook Services',
  'com.facebook.orca': 'Messenger',
  'com.instagram.android': 'Instagram',
  'com.whatsapp': 'WhatsApp',

  // ── Other common pre-loads ──
  'com.netflix.mediaclient': 'Netflix',
  'com.spotify.music': 'Spotify',
  'com.amazon.appmanager': 'Amazon App',
  'com.amazon.mShop.android.shopping': 'Amazon Shopping',
  'com.booking': 'Booking.com',
  'com.tiktok.android': 'TikTok',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.twitter.android': 'X (Twitter)',
  'com.snapchat.android': 'Snapchat',

  // ── AOSP / system internals ──
  'com.android.settings': 'Settings',
  'com.android.systemui': 'System UI',
  'com.android.launcher3': 'Launcher',
  'com.android.phone': 'Phone Services',
  'com.android.bluetooth': 'Bluetooth',
  'com.android.nfc': 'NFC Service',
  'com.android.providers.media': 'Media Storage',
  'com.android.providers.downloads': 'Downloads',
  'com.android.providers.calendar': 'Calendar Storage',
  'com.android.providers.contacts': 'Contacts Storage',
  'com.android.documentsui': 'Files',
  'com.android.printspooler': 'Print Spooler',
  'com.android.calculator2': 'Calculator',
  'com.android.deskclock': 'Clock',
  'com.android.camera2': 'Camera',
  'com.android.gallery3d': 'Gallery',
  'com.android.calendar': 'Calendar',
  'com.android.contacts': 'Contacts',
  'com.android.email': 'Email',
  'com.android.soundrecorder': 'Sound Recorder',
  'com.android.wallpaper.livepicker': 'Live Wallpapers',
  'com.android.cellbroadcastreceiver': 'Emergency Alerts',
  'com.android.emergency': 'Emergency Information',
};

// Vendor prefixes to strip when smart-formatting unknown packages.
const VENDOR_PREFIXES = [
  'com.google.android.apps.',
  'com.google.android.',
  'com.google.',
  'com.samsung.android.app.',
  'com.samsung.android.',
  'com.sec.android.app.',
  'com.sec.android.',
  'com.miui.',
  'com.xiaomi.',
  'com.huawei.',
  'com.coloros.',
  'com.oppo.',
  'com.oneplus.',
  'com.vivo.',
  'com.motorola.',
  'com.lge.',
  'com.sonymobile.',
  'com.microsoft.',
  'com.facebook.',
  'com.amazon.',
  'com.android.',
  'android.',
  'com.',
  'org.',
  'net.',
];

function smartFormat(pkg) {
  let working = pkg;
  for (const prefix of VENDOR_PREFIXES) {
    if (working.startsWith(prefix)) {
      working = working.slice(prefix.length);
      break;
    }
  }

  // Take the most descriptive remaining segment (longest, skipping
  // generic ones like "android", "app", "service").
  const generic = new Set(['android', 'app', 'apps', 'service', 'services', 'provider', 'providers']);
  const segments = working.split('.').filter(Boolean);
  let segment = segments[segments.length - 1] || pkg;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (!generic.has(segments[i].toLowerCase())) {
      segment = segments[i];
      break;
    }
  }

  return segment
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → spaced
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function resolveAppName(pkg) {
  return KNOWN_LABELS[pkg] || smartFormat(pkg);
}

module.exports = { resolveAppName, KNOWN_LABELS };
