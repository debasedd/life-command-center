// Violet Rail reskin: map Linear-inspired palette -> DesainPakeAI Violet Rail tokens
const fs = require("fs");
const path = require("path");

const MAP = [
  // order: longer/unique first
  ["#6975e0", "#531aff"], // primary hover -> accent
  ["#5561c8", "#4520cc"], // primary active -> accent darker
  ["#2fbd50", "#72b39a"], // success hover
  ["#828fff", "#a78bfa"], // light accent -> focus ring
  ["#4d9f68", "#72b39a"], // mid green (heatmap)
  ["#3d5c4a", "#2c4a40"], // dark green (heatmap)
  ["#6366f1", "#531aff"], // stray indigo
  ["#23252a", "#374151"], // ring track -> border
  ["#0f1011", "#0d0c14"], // near-black surface
  ["#5e6ad2", "#553f83"], // primary button -> primary
  ["#f5a623", "#eab38a"], // amber -> warning
  ["#27a644", "#609f89"], // success -> positive
  ["#eb5757", "#f87171"], // danger
  ["#8a8f98", "#868593"], // muted text
  ["#f7f8f8", "#ffffff"], // text
  ["#62666d", "#868593"], // faint text
  ["#7170ff", "#531aff"], // accent
  ["#d0d6e0", "#c4c4ca"], // soft text
  ["#4a4d52", "#868593"], // very faint text -> muted
  ["#191a1b", "#221228"], // sheet/toast surface -> raised
  ["#08090a", "#13111c"], // canvas
];

const ROOTS = ["app", "components", "lib"];
const EXT = new Set([".tsx", ".ts", ".css"]);
let totalFiles = 0, totalHits = 0;
const hits = {};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    let src = fs.readFileSync(file, "utf8");
    let changed = false;
    for (const [from, to] of MAP) {
      const re = new RegExp(from.replace("#", "#"), "gi");
      const n = (src.match(re) || []).length;
      if (n) {
        src = src.replace(re, to);
        hits[from] = (hits[from] || 0) + n;
        totalHits += n;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, src);
      totalFiles++;
    }
  }
}
console.log("files changed:", totalFiles, "| replacements:", totalHits);
console.log(JSON.stringify(hits, null, 1));
