#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--intake") args.intake = argv[++i];
  }
  return args;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function resolveAssetPath(baseDir, item) {
  const path = item.returnedPath || item.expectedPath;
  if (!path) return "";
  return isAbsolute(path) ? path : join(baseDir, path);
}

function needsRightsMetadata(item) {
  return item.taskType === "source-evidence" || item.taskType === "verified-chart";
}

function missingRightsFields(item) {
  if (!needsRightsMetadata(item)) return [];
  return ["sourceUrl", "license", "owner", "accessDate"].filter((field) => !String(item[field] || "").trim());
}

async function checkIntake(intakePath) {
  const baseDir = dirname(intakePath);
  const intake = JSON.parse(await readFile(intakePath, "utf8"));
  const items = intake.items || [];
  const results = [];

  for (const item of items) {
    const assetPath = resolveAssetPath(baseDir, item);
    const fileExists = assetPath ? await exists(assetPath) : false;
    const missingRights = missingRightsFields(item);
    const status = fileExists && missingRights.length === 0 ? "ready" : "blocked";
    results.push({
      beatId: item.beatId,
      taskType: item.taskType,
      priority: item.priority,
      status,
      fileExists,
      assetPath,
      missingRights
    });
  }

  return results;
}

function printReport(results) {
  const ready = results.filter((item) => item.status === "ready").length;
  const blocked = results.length - ready;
  const highPriorityBlocked = results.filter((item) => item.status !== "ready" && item.priority === "high");

  console.log(`Asset intake check: ${ready}/${results.length} ready, ${blocked} blocked`);

  if (highPriorityBlocked.length) {
    console.log("\nHigh-priority blockers:");
    for (const item of highPriorityBlocked.slice(0, 30)) {
      const reasons = [
        item.fileExists ? "" : "missing file",
        item.missingRights.length ? `missing rights fields: ${item.missingRights.join(", ")}` : ""
      ].filter(Boolean).join("; ");
      console.log(`- ${item.beatId} (${item.taskType}): ${reasons}`);
    }
    if (highPriorityBlocked.length > 30) {
      console.log(`- ...and ${highPriorityBlocked.length - 30} more`);
    }
  }

  if (blocked > 0) process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.intake) {
    console.error("Usage: node video-tool/check-assets.js --intake outputs/video-tool-v0.3-planning-demo/asset-intake.json");
    process.exit(1);
  }

  const results = await checkIntake(args.intake);
  printReport(results);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
