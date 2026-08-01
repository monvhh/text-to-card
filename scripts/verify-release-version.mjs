import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const tag = process.argv[2];
assert.match(tag ?? "", /^\d+\.\d+\.\d+$/, "Tag must be x.y.z");

const manifest = JSON.parse(
  await readFile(new URL("../manifest.json", import.meta.url), "utf8")
);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const versions = JSON.parse(
  await readFile(new URL("../versions.json", import.meta.url), "utf8")
);

assert.equal(manifest.version, tag, "manifest.json version must match tag");
assert.equal(packageJson.version, tag, "package.json version must match tag");
assert.ok(versions[tag], `versions.json must contain ${tag}`);

console.log(`Release version ${tag} is consistent`);
