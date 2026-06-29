// A clean, deterministic monogram tile used in place of real (un-pullable)
// Android app icons: first letter of the app name on a colour derived from
// the package name, so each app gets a stable, distinct icon.
export default function AppIcon({ pkg = '', name = '', size = 40 }) {
  const source = (name || pkg || '?').trim();
  const letter = source ? source[0].toUpperCase() : '?';

  let h = 0;
  for (let i = 0; i < pkg.length; i++) h = (Math.imul(h, 31) + pkg.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 38) % 360;

  return (
    <div
      className="app-icon"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: `linear-gradient(135deg, hsl(${hue}deg 60% 55%), hsl(${hue2}deg 66% 45%))`,
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}
