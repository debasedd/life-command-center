// White-minimal migration: tokens, type classes, translucency flips.
const fs = require("fs");
const path = require("path");

const FILES = [
  "app/(app)/tasks/page.tsx",
  "app/(app)/finance/page.tsx",
  "app/(app)/health/page.tsx",
  "app/(app)/profile/page.tsx",
  "app/(app)/advisor/page.tsx",
  "app/(app)/invest/page.tsx",
  "app/(app)/whatif/page.tsx",
  "app/(app)/offline-ready/page.tsx",
  "app/layout.tsx",
  "components/ai-homework.tsx",
  "components/push-manager.tsx",
];

// ORDER: longer first (avoid prefix collisions)
const MAP = [
  ["var(--vr-surface-raised)", "var(--ui-surface)"],
  ["var(--vr-surface-muted)", "var(--ui-surface-muted)"],
  ["var(--vr-text-soft)", "var(--ui-text-soft)"],
  ["var(--vr-text-muted)", "var(--ui-text-muted)"],
  ["var(--vr-text)", "var(--ui-text)"],
  ["var(--vr-focus-ring)", "var(--ui-focus-ring)"],
  ["var(--vr-primary-hover)", "var(--ui-primary-hover)"],
  ["var(--vr-primary)", "var(--ui-primary)"],
  ["var(--vr-on-primary)", "var(--ui-on-primary)"],
  ["var(--vr-canvas)", "var(--ui-canvas)"],
  ["var(--vr-surface)", "var(--ui-surface)"],
  ["var(--vr-border)", "var(--ui-border)"],
  ["var(--vr-positive)", "var(--ui-positive)"],
  ["var(--vr-warning)", "var(--ui-warning)"],
  ["var(--vr-danger)", "var(--ui-danger)"],
  ["var(--vr-accent)", "var(--ui-text)"],
  // type classes
  ["vr-display", "display"],
  ["vr-title", "title-lg"],
  ["vr-kicker", "kicker"],
  ["vr-num", "num"],
  // darkness flips
  ["bg-white/[0.03]", "bg-black/[0.03]"],
  ["bg-white/[0.04]", "bg-black/[0.04]"],
  ["bg-white/[0.05]", "bg-black/[0.05]"],
  ["bg-white/[0.06]", "bg-black/[0.06]"],
  ["bg-white/[0.08]", "bg-black/[0.07]"],
  ["bg-white/20", "bg-black/12"],
  ["hover:bg-white/[0.04]", "hover:bg-black/[0.04]"],
  ["hover:bg-white/[0.03]", "hover:bg-black/[0.03]"],
  ["border-white/[0.1]", "border-black/[0.08]"],
  ["border-white/25", "border-black/20"],
  ["hover:border-white/50", "hover:border-black/40"],
  ["border-white/[0.08]", "border-[color:var(--ui-border)]"],
  ["border-white/[0.06]", "border-[color:var(--ui-border)]"],
  ["bg-black/85", "bg-black/40"],
  ["border-white/[0.04]", "border-[color:var(--ui-border)]"],
];

let total = 0;
for (const file of FILES) {
  if (!fs.existsSync(file)) continue;
  let src = fs.readFileSync(file, "utf8");
  let n = 0;
  for (const [from, to] of MAP) {
    const parts = src.split(from);
    n += parts.length - 1;
    src = parts.join(to);
  }
  if (n) {
    fs.writeFileSync(file, src);
    console.log(file, "->", n);
    total += n;
  }
}
console.log("total:", total);