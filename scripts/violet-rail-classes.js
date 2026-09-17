// Violet Rail: swap raw hex utility classes for semantic token classes (remaining pages).
const fs = require("fs");
const path = require("path");

const MAP = [
  ["text-[#868593]", "text-muted"],
  ["text-[#c4c4ca]", "text-soft"],
  ["text-[#ffffff]", "text-ink"],
  ["text-[#72b39a]", "text-[color:var(--vr-positive)]"],
  ["text-[#609f89]", "text-[color:var(--vr-positive)]"],
  ["text-[#f87171]", "text-[color:var(--vr-danger)]"],
  ["text-[#531aff]", "text-[color:var(--vr-accent)]"],
  ["text-[#a78bfa]", "text-[color:var(--vr-focus-ring)]"],
  ["text-[#eab38a]", "text-[color:var(--vr-warning)]"],
  ["hover:text-[#f87171]", "hover:text-[color:var(--vr-danger)]"],
  ["hover:text-[#a78bfa]", "hover:text-[color:var(--vr-focus-ring)]"],
  ["hover:text-[#ffffff]", "hover:text-ink"],
  ["bg-[#531aff]", "bg-[color:var(--vr-accent)]"],
  ["bg-[#553f83]", "bg-[color:var(--vr-primary)]"],
  ["bg-[#609f89]", "bg-[color:var(--vr-positive)]"],
  ["bg-[#f87171]", "bg-[color:var(--vr-danger)]"],
  ["bg-[#0d0c14]/[0.98]", "bg-[color:var(--vr-surface)]/[0.98]"],
  ["border-[#531aff]", "border-[color:var(--vr-accent)]"],
  ["border-[#609f89]", "border-[color:var(--vr-positive)]"],
  ["border-[#f87171]/30", "border-[color:var(--vr-danger)]/30"],
  ["border-[#609f89]/30", "border-[color:var(--vr-positive)]/30"],
  ["border-[#eab38a]/30", "border-[color:var(--vr-warning)]/30"],
  ["border-[#531aff]/30", "border-[color:var(--vr-accent)]/30"],
  ["border-[#553f83]", "border-[color:var(--vr-primary)]"],
  ["border-white/[0.06]", "border-lineSoft"],
  ["border-white/[0.08]", "border-lineSoft"],
  ["bg-white/[0.02]", "bg-white/[0.03]"],
  ["from-[#553f83]", "from-[color:var(--vr-primary)]"],
];

// ORDER matters: longer patterns first. Sort by length desc.
const SORTED = [...MAP].sort((a, b) => b[0].length - a[0].length);

const FILES = [
  "app/(app)/finance/page.tsx",
  "app/(app)/health/page.tsx",
  "app/(app)/profile/page.tsx",
  "app/(app)/advisor/page.tsx",
  "app/(app)/invest/page.tsx",
  "app/(app)/whatif/page.tsx",
  "components/ai-homework.tsx",
  "components/push-manager.tsx",
  "components/boot-gate.tsx",
];

let totalHits = 0;
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, "utf8");
  let n = 0;
  for (const [from, to] of SORTED) {
    const parts = src.split(from);
    n += parts.length - 1;
    src = parts.join(to);
  }
  if (n) {
    fs.writeFileSync(file, src);
    console.log(file, "->", n, "hits");
    totalHits += n;
  }
}
console.log("total:", totalHits);
