#!/usr/bin/env node
// Run after the Android package and Play App Signing SHA-256 are known.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [packageName, ...fingerprints] = process.argv.slice(2);
const validPackage = /^(?:[A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/;
const validFingerprint = /^(?:[A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/;

if (!packageName || !validPackage.test(packageName) || !fingerprints.length ||
    fingerprints.some((value) => !validFingerprint.test(value))) {
  console.error("Usage: node scripts/create-assetlinks.mjs <Android package> <Play signing SHA-256> [local signing SHA-256]");
  process.exit(1);
}

const target = join(process.cwd(), "public", ".well-known", "assetlinks.json");
const statements = [{
  relation: ["delegate_permission/common.handle_all_urls"],
  target: {
    namespace: "android_app",
    package_name: packageName,
    sha256_cert_fingerprints: [...new Set(fingerprints.map((value) => value.toUpperCase()))],
  },
}];

await mkdir(join(process.cwd(), "public", ".well-known"), { recursive: true });
await writeFile(target, `${JSON.stringify(statements, null, 2)}\n`);
console.log(`Wrote ${target}`);
