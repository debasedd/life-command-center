// Page chrome: header (kicker + display serif) and segmented container to Violet Rail.
const fs = require("fs");

const PAGES = [
  ["app/(app)/finance/page.tsx", "Buku Kas"],
  ["app/(app)/health/page.tsx", "Tubuh & Kebiasaan"],
  ["app/(app)/profile/page.tsx", "Akun & Pengaturan"],
  ["app/(app)/advisor/page.tsx", "Evaluasi Keuangan"],
  ["app/(app)/invest/page.tsx", "Proyeksi"],
  ["app/(app)/whatif/page.tsx", "Simulasi"],
];

const HEADER_RE =
  /<header className="flex items-center justify-between mb-4 pt-1">\s*\n\s*<h1 className="text-\[17px\] font-semibold tracking-\[-0\.02em\] text-ink">([^<]+)<\/h1>/;

let changed = 0;
for (const [file, kicker] of PAGES) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, "utf8");
  const m = src.match(HEADER_RE);
  if (m) {
    const replacement = `<header className="flex items-end justify-between gap-3 mb-5 pt-1">
        <div>
          <p className="vr-kicker">${kicker}</p>
          <h1 className="vr-display mt-1">${m[1]}</h1>
        </div>`;
    src = src.replace(HEADER_RE, replacement);
    changed++;
  }
  // segmented containers -> card radius token
  src = src.split('flex rounded-lg bg-white/[0.03] border border-lineSoft p-1 mb-4').join('flex rounded-card bg-white/[0.03] border border-lineSoft p-1 mb-2');
  src = src.split('grid grid-cols-4 gap-1 rounded-lg bg-white/[0.03] border border-lineSoft p-1 mb-4').join('grid grid-cols-4 gap-1 rounded-card bg-white/[0.03] border border-lineSoft p-1 mb-2');
  fs.writeFileSync(file, src);
}
console.log("headers changed:", changed);
