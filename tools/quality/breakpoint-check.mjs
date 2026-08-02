#!/usr/bin/env node
/**
 * breakpoint-check.mjs — enforces The Breakpoint Rule (AGENTS.md / responsive-breakpoints).
 *
 * Fails (exit 1) if any CSS in blocks/**\/*.css or styles/*.css:
 *   - uses a `max-width` media query (no mixing min/max — mobile-first only), or
 *   - uses a min-width / range media query at a width outside the sanctioned set.
 *
 * Sanctioned breakpoints: 600px, 900px, 1200px (all min-width / `width >= …`).
 * Mirrors https://www.aem.live/docs/dev-collab-and-good-practices
 *
 * Usage:
 *   node tools/quality/breakpoint-check.mjs            # scan default globs
 *   node tools/quality/breakpoint-check.mjs a.css b.css # scan specific files
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ALLOWED = new Set([600, 900, 1200]);
const ROOT = process.cwd();

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      walk(full, out);
    } else if (name.endsWith('.css')) {
      out.push(full);
    }
  }
  return out;
}

function collectFiles() {
  const args = process.argv.slice(2);
  if (args.length) return args.map((a) => join(ROOT, a));
  const files = [];
  walk(join(ROOT, 'blocks'), files);
  // styles/*.css only (not recursive)
  try {
    for (const name of readdirSync(join(ROOT, 'styles'))) {
      if (name.endsWith('.css')) files.push(join(ROOT, 'styles', name));
    }
  } catch { /* no styles dir */ }
  return files;
}

const violations = [];

for (const file of collectFiles()) {
  let css;
  try { css = readFileSync(file, 'utf8'); } catch { continue; }
  const rel = relative(ROOT, file);
  const lines = css.split('\n');

  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    if (!lower.includes('@media')) return;
    const ln = i + 1;

    // 1. No max-width media queries (no min/max mixing).
    if (/\bmax-width\s*:/.test(lower) || /width\s*<=?/.test(lower)) {
      violations.push({ rel, ln, msg: 'max-width media query — use mobile-first min-width only', code: line.trim() });
    }

    // 2. Every min-width / range value must be sanctioned.
    //    Matches `min-width: 900px`, `width >= 900px`, `900px <= width`.
    const widthMatches = [...lower.matchAll(/(?:min-width\s*:\s*|width\s*>=?\s*|>=?\s*)(\d+)px/g)];
    for (const m of widthMatches) {
      const px = Number(m[1]);
      if (!ALLOWED.has(px)) {
        violations.push({ rel, ln, msg: `breakpoint ${px}px not in {600, 900, 1200}`, code: line.trim() });
      }
    }
  });
}

if (violations.length) {
  console.error('\n✖ Breakpoint Rule violations:\n');
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.ln}  ${v.msg}`);
    console.error(`      ${v.code}`);
  }
  console.error(`\n${violations.length} violation(s). Fix per skills/responsive-breakpoints.\n`);
  process.exit(1);
}

console.log('✓ Breakpoint check passed (600/900/1200 min-width only).');
