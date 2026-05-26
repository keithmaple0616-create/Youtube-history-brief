#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--plan") args.plan = argv[++i];
    else if (token === "--out") args.out = argv[++i];
    else if (token === "--strict") args.strict = true;
  }
  return args;
}

function pct(count, total) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function riskLevel(value) {
  const normalized = String(value || "unknown").toLowerCase();
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("low")) return "low";
  return "unknown";
}

function isEvidenceLike(beat) {
  return beat.type === "evidence" || /official|public-domain|cleared|source|footage|archive/i.test(`${beat.visualGoal || ""} ${beat.sourcePolicy || ""}`);
}

function isDiagramLike(beat) {
  return beat.type === "diagram" || beat.type === "chart";
}

function isGeneratedLike(beat) {
  return beat.type === "generated-illustration";
}

function hasFakeEvidenceRisk(beat) {
  const text = `${beat.text || ""} ${beat.visualNote || ""} ${beat.sourcePolicy || ""} ${beat.visualGoal || ""}`;
  return isGeneratedLike(beat) && /\b(president|trump|biden|xi|putin|netanyahu|khamenei|election|court|white house|congress|news|screenshot|document|classified|leaked)\b/i.test(text);
}

function auditPlan(plan) {
  const beats = Array.isArray(plan.beats) ? plan.beats : [];
  const total = beats.length;
  const typeCounts = countBy(beats, "type");
  const roleCounts = countBy(beats, "role");
  const risks = beats.reduce((counts, beat) => {
    const level = riskLevel(beat.rightsRisk);
    counts[level] = (counts[level] || 0) + 1;
    return counts;
  }, {});

  const evidenceBeats = beats.filter(isEvidenceLike);
  const diagramBeats = beats.filter(isDiagramLike);
  const generatedBeats = beats.filter(isGeneratedLike);
  const titleBeats = beats.filter((beat) => beat.type === "title-card" || beat.type === "chapter-card");
  const highRiskBeats = beats.filter((beat) => riskLevel(beat.rightsRisk) === "high");
  const fakeEvidenceRiskBeats = beats.filter(hasFakeEvidenceRisk);
  const longTextBeats = beats.filter((beat) => String(beat.text || "").length > 950);
  const emptyAssetPolicyBeats = beats.filter((beat) => !String(beat.sourcePolicy || "").trim());

  const findings = [];

  function addFinding(severity, code, message, beatIds = []) {
    findings.push({ severity, code, message, beatIds });
  }

  if (!total) {
    addFinding("fail", "empty-plan", "visual-plan.json does not contain any beats.");
  }

  if (total > 0 && pct(diagramBeats.length, total) > 45) {
    addFinding(
      "warn",
      "diagram-heavy",
      `Diagram/chart beats are ${pct(diagramBeats.length, total)}% of the plan. The video may feel like a presentation unless evidence, footage, and generated scene plates carry more of the runtime.`,
      diagramBeats.slice(0, 12).map((beat) => beat.id)
    );
  }

  if (total >= 8 && pct(evidenceBeats.length, total) < 20) {
    addFinding(
      "warn",
      "evidence-light",
      `Evidence-like beats are only ${pct(evidenceBeats.length, total)}% of the plan. Add official/public-domain/cleared visuals where the script makes factual claims.`,
      beats.filter((beat) => beat.role === "argument").slice(0, 10).map((beat) => beat.id)
    );
  }

  if (total > 0 && pct(titleBeats.length, total) > 25) {
    addFinding(
      "warn",
      "too-many-cards",
      `Title/chapter cards are ${pct(titleBeats.length, total)}% of the plan. Keep cards as transitions, not the main visual language.`,
      titleBeats.map((beat) => beat.id)
    );
  }

  if (highRiskBeats.length) {
    addFinding(
      "fail",
      "high-rights-risk",
      `${highRiskBeats.length} beat(s) are marked high rights risk. Replace with licensed/public-domain evidence, code-native diagrams, or clearly labeled illustration.`,
      highRiskBeats.map((beat) => beat.id)
    );
  }

  if (fakeEvidenceRiskBeats.length) {
    addFinding(
      "fail",
      "generated-fake-evidence-risk",
      `${fakeEvidenceRiskBeats.length} generated/illustrative beat(s) mention real current figures, news, screenshots, or documents. These need strong labeling or a non-generated visual strategy.`,
      fakeEvidenceRiskBeats.map((beat) => beat.id)
    );
  }

  if (longTextBeats.length) {
    addFinding(
      "warn",
      "long-beat-text",
      `${longTextBeats.length} beat(s) carry very long narration chunks. Consider splitting them before assembly so the edit has room to breathe.`,
      longTextBeats.map((beat) => beat.id)
    );
  }

  if (emptyAssetPolicyBeats.length) {
    addFinding(
      "warn",
      "missing-source-policy",
      `${emptyAssetPolicyBeats.length} beat(s) are missing sourcePolicy. Assembly will be harder to review for rights and evidence boundaries.`,
      emptyAssetPolicyBeats.map((beat) => beat.id)
    );
  }

  const failCount = findings.filter((finding) => finding.severity === "fail").length;
  const warnCount = findings.filter((finding) => finding.severity === "warn").length;
  const status = failCount ? "blocked" : warnCount ? "review" : "pass";

  return {
    schemaVersion: 1,
    status,
    summary: {
      lane: plan.lane || "unknown",
      beatCount: total,
      typeCounts,
      roleCounts,
      rightsRiskCounts: risks,
      evidencePercent: pct(evidenceBeats.length, total),
      diagramPercent: pct(diagramBeats.length, total),
      generatedPercent: pct(generatedBeats.length, total),
      cardPercent: pct(titleBeats.length, total),
      failCount,
      warnCount
    },
    findings
  };
}

function formatCounts(counts) {
  const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "- none";
  return entries.map(([key, value]) => `- ${key}: ${value}`).join("\n");
}

function formatMarkdown(report, planPath) {
  const lines = [];
  lines.push("# Visual Plan Audit");
  lines.push("");
  lines.push(`Plan: \`${planPath}\``);
  lines.push(`Status: **${report.status}**`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Lane: ${report.summary.lane}`);
  lines.push(`- Beats: ${report.summary.beatCount}`);
  lines.push(`- Evidence-like: ${report.summary.evidencePercent}%`);
  lines.push(`- Diagram/chart: ${report.summary.diagramPercent}%`);
  lines.push(`- Generated/illustration: ${report.summary.generatedPercent}%`);
  lines.push(`- Title/chapter cards: ${report.summary.cardPercent}%`);
  lines.push(`- Findings: ${report.summary.failCount} fail, ${report.summary.warnCount} warn`);
  lines.push("");
  lines.push("## Beat Types");
  lines.push("");
  lines.push(formatCounts(report.summary.typeCounts));
  lines.push("");
  lines.push("## Rights Risk");
  lines.push("");
  lines.push(formatCounts(report.summary.rightsRiskCounts));
  lines.push("");
  lines.push("## Findings");
  lines.push("");

  if (!report.findings.length) {
    lines.push("- No audit findings.");
  } else {
    for (const finding of report.findings) {
      lines.push(`- **${finding.severity.toUpperCase()} ${finding.code}**: ${finding.message}`);
      if (finding.beatIds.length) lines.push(`  Beats: ${finding.beatIds.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("## Next Review Questions");
  lines.push("");
  lines.push("- Which factual claims require real evidence visuals?");
  lines.push("- Which generated images need an on-screen illustration label?");
  lines.push("- Which diagram beats should be replaced by motion footage or scene plates?");
  lines.push("- Which high-priority assets must be sourced before assembly?");
  lines.push("");
  return lines.join("\n");
}

function printConsole(report) {
  console.log(`Visual plan audit: ${report.status}`);
  console.log(`Beats: ${report.summary.beatCount}`);
  console.log(`Evidence-like: ${report.summary.evidencePercent}%`);
  console.log(`Diagram/chart: ${report.summary.diagramPercent}%`);
  console.log(`Generated/illustration: ${report.summary.generatedPercent}%`);
  console.log(`Findings: ${report.summary.failCount} fail, ${report.summary.warnCount} warn`);

  if (report.findings.length) {
    console.log("\nFindings:");
    for (const finding of report.findings.slice(0, 20)) {
      const beatList = finding.beatIds.length ? ` (${finding.beatIds.slice(0, 8).join(", ")})` : "";
      console.log(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}${beatList}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.plan) {
    console.error("Usage: node video-tool/audit-plan.js --plan outputs/video-tool-v0.3-planning-demo/visual-plan.json [--out outputs/audit] [--strict]");
    process.exit(1);
  }

  const plan = JSON.parse(await readFile(args.plan, "utf8"));
  const report = auditPlan(plan);
  printConsole(report);

  if (args.out) {
    await mkdir(args.out, { recursive: true });
    await writeFile(join(args.out, "audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(join(args.out, "audit-report.md"), formatMarkdown(report, args.plan));
    console.log(`\nWrote ${join(args.out, "audit-report.md")}`);
  } else {
    const defaultOut = dirname(args.plan);
    await writeFile(join(defaultOut, "audit-report.md"), formatMarkdown(report, args.plan));
  }

  if (args.strict && report.status === "blocked") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
