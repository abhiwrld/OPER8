#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const repoRoot = resolve(import.meta.dirname, "..");
const sourceArgIndex = process.argv.indexOf("--source");
const sourcePath =
  sourceArgIndex === -1
    ? resolve(repoRoot, "assets/source/oper8-icon.svg")
    : resolve(process.cwd(), process.argv[sourceArgIndex + 1] ?? "");

if (!existsSync(sourcePath)) {
  throw new Error(`Icon source does not exist: ${sourcePath}`);
}

const tempRoot = mkdtempSync(join(tmpdir(), "oper8-icons-"));
const tempSourcePng = join(tempRoot, "source-1024.png");
const tempIconset = join(tempRoot, "icon.iconset");
const tempPng256 = join(tempRoot, "source-256.png");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", stdio: "pipe" });
  if (result.status === 0) {
    return;
  }

  const details = [result.stdout, result.stderr].filter(Boolean).join("\n");
  throw new Error(`Failed to run ${command} ${args.join(" ")}: ${details}`.trim());
}

function renderSourceToPng() {
  const extension = extname(sourcePath).toLowerCase();
  if (extension === ".png") {
    run("sips", ["-z", "1024", "1024", sourcePath, "--out", tempSourcePng]);
    return;
  }

  const outputDir = join(tempRoot, "rendered");
  mkdirSync(outputDir, { recursive: true });
  run("qlmanage", ["-t", "-s", "1024", "-o", outputDir, sourcePath]);
  const renderedPath = join(outputDir, `${basename(sourcePath)}.png`);
  if (!existsSync(renderedPath)) {
    throw new Error(`Quick Look did not render an icon at ${renderedPath}`);
  }
  copyFileSync(renderedPath, tempSourcePng);
}

function resizePng(size, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  run("sips", ["-z", String(size), String(size), tempSourcePng, "--out", outputPath]);
}

function icoSizeByte(size) {
  return size >= 256 ? 0 : size;
}

function writeIco(images, outputPath) {
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + entrySize * images.length;
  const chunks = [];
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  chunks.push(header);

  const imageData = images.map((image) => ({
    ...image,
    bytes: readFileSync(image.path),
  }));

  for (const image of imageData) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(icoSizeByte(image.size), 0);
    entry.writeUInt8(icoSizeByte(image.size), 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.bytes.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.bytes.length;
    chunks.push(entry);
  }

  for (const image of imageData) {
    chunks.push(image.bytes);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.concat(chunks));
}

function generateMacIconSet(outputPath) {
  mkdirSync(tempIconset, { recursive: true });
  for (const size of [16, 32, 128, 256, 512]) {
    resizePng(size, join(tempIconset, `icon_${size}x${size}.png`));
    resizePng(size * 2, join(tempIconset, `icon_${size}x${size}@2x.png`));
  }
  run("iconutil", ["-c", "icns", tempIconset, "-o", outputPath]);
}

try {
  renderSourceToPng();

  for (const target of [
    "assets/prod/black-macos-1024.png",
    "assets/prod/black-universal-1024.png",
    "assets/prod/black-ios-1024.png",
    "assets/dev/blueprint-macos-1024.png",
    "assets/dev/blueprint-universal-1024.png",
    "assets/dev/blueprint-ios-1024.png",
    "assets/nightly/blueprint-macos-1024.png",
    "assets/nightly/blueprint-universal-1024.png",
    "assets/nightly/blueprint-ios-1024.png",
  ]) {
    copyFileSync(tempSourcePng, resolve(repoRoot, target));
  }

  resizePng(256, tempPng256);

  for (const { brand, prefix } of [
    { brand: "prod", prefix: "t3-black" },
    { brand: "dev", prefix: "blueprint" },
    { brand: "nightly", prefix: "blueprint" },
  ]) {
    const brandDir = resolve(repoRoot, "assets", brand);
    const png16 = join(brandDir, `${prefix}-web-favicon-16x16.png`);
    const png32 = join(brandDir, `${prefix}-web-favicon-32x32.png`);
    resizePng(180, join(brandDir, `${prefix}-web-apple-touch-180.png`));
    resizePng(32, png32);
    resizePng(16, png16);
    writeIco(
      [
        { size: 16, path: png16 },
        { size: 32, path: png32 },
      ],
      join(brandDir, `${prefix}-web-favicon.ico`),
    );
    writeIco(
      [
        { size: 16, path: png16 },
        { size: 32, path: png32 },
        { size: 256, path: tempPng256 },
      ],
      join(brandDir, `${prefix}-windows.ico`),
    );
  }

  resizePng(512, resolve(repoRoot, "apps/desktop/resources/icon.png"));
  generateMacIconSet(resolve(repoRoot, "apps/desktop/resources/icon.icns"));
  writeIco(
    [
      { size: 16, path: resolve(repoRoot, "assets/prod/t3-black-web-favicon-16x16.png") },
      { size: 32, path: resolve(repoRoot, "assets/prod/t3-black-web-favicon-32x32.png") },
      { size: 256, path: tempPng256 },
    ],
    resolve(repoRoot, "apps/desktop/resources/icon.ico"),
  );

  console.log(`Generated OPER8 icons from ${sourcePath}`);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
