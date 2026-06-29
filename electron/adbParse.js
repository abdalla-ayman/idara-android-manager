// Pure parsers for `adb` text output — no Electron/Node-IO dependencies,
// so they can be unit-tested in isolation.

/** Parse `adb devices -l` into structured device entries. */
function parseDevices(output) {
  return output
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('List of devices'))
    .map((line) => {
      const [serial, status, ...rest] = line.split(/\s+/);
      if (!serial || !status) return null;
      const meta = {};
      for (const pair of rest) {
        const [k, v] = pair.split(':');
        if (k && v) meta[k] = v;
      }
      return {
        id: serial,
        status, // device | unauthorized | offline | ...
        model: meta.model ? meta.model.replace(/_/g, ' ') : null,
        transportId: meta.transport_id || null,
      };
    })
    .filter(Boolean);
}

/** Parse `pm list packages` output into a Set of package names. */
function parsePackageList(output) {
  return new Set(
    output
      .split('\n')
      .filter((l) => l.startsWith('package:'))
      .map((l) => l.replace('package:', '').split('\t')[0].trim())
      .filter(Boolean)
  );
}

module.exports = { parseDevices, parsePackageList };
