import process from "node:process";

const requiredMajor = 22;
const currentVersion = process.version;
const currentMajor = Number.parseInt(currentVersion.replace(/^v/, "").split(".")[0], 10);

if (Number.isNaN(currentMajor) || currentMajor < requiredMajor) {
  console.error(
    `\x1b[31m[ERROR] Node.js version >= ${requiredMajor}.0.0 is required. Current version is ${currentVersion}.\x1b[0m`,
  );
  process.exit(1);
}

console.log(
  `\x1b[32m[OK] Node.js version ${currentVersion} satisfies requirement (>= v${requiredMajor}.0.0).\x1b[0m`,
);
process.exit(0);
