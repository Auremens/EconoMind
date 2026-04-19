#!/usr/bin/env node
/**
 * Generates icon-192.png and icon-512.png from icon.svg
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const svgPath = path.join(__dirname, "../public/icons/icon.svg");
const outDir = path.join(__dirname, "../public/icons");

async function generate() {
  const svg = fs.readFileSync(svgPath);
  for (const size of [192, 512]) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`));
    console.log(`✅ icon-${size}.png generated`);
  }
}

generate().catch(console.error);
