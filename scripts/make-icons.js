// Generate PNG app icons from the white-minimal icon.svg (sharp, via next).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

(async () => {
  const svg = fs.readFileSync("public/icon.svg");
  const dir = "public/icons";
  fs.mkdirSync(dir, { recursive: true });
  const sizes = [
    ["apple-touch-icon.png", 180],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
  ];
  for (const [name, size] of sizes) {
    await sharp(svg).resize(size, size).png().toFile(path.join(dir, name));
    console.log("written:", path.join(dir, name));
  }
})();
