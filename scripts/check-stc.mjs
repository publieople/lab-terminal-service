#!/usr/bin/env node
/**
 * STC 回归门：只拦两条误报少、按页能直接改的规则。
 *
 *   D1  读者不知道主语是谁   （正文里用「它 / 他们」代替明确的名称）
 *   G7  口号代替了事实       （「不是 X，而是 Y」这类对比口号）
 *
 * 为什么不跑全部规则：这个检查器面向产品说明书语料，本库现有 46 篇文档里
 * 一次能报出 537 个错误 + 558 个警告，其中 597 条是引号（G17，与本库规矩冲突）、
 * 147 条是长句（G12，技术步骤很难压到 40 字以内）。全量接进门禁等于天天红，
 * 最后一定被绕过。只挑这两条，是因为它们改起来没有争议：删掉代词、把口号改成
 * 直陈，句子只会更清楚。
 *
 * 存量不加锁：本库还有 200 多处代词主语（集中在待重排的旧页面）。这些不改完，
 * 门禁就会一直红，所以按「文件 + 规则」记一份基线，只拦新增：
 * 某个文件的命中数超过基线就失败。清理过的文件请重跑 --update 把基线压低。
 *
 * 用法：
 *   node scripts/check-stc.mjs                 # 按基线检查，有新增就退出码 1
 *   node scripts/check-stc.mjs --update        # 用当前结果重写基线
 *   node scripts/check-stc.mjs --all           # 不按基线，列出全部命中（审稿用）
 *   node scripts/check-stc.mjs --target docs/部门/终端服务部/参考/SSH.md
 *   node scripts/check-stc.mjs --json          # 机器可读
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLI = path.join(ROOT, 'skills', 'stc', 'tools', 'cli.mjs');
const BASELINE_FILE = path.join(ROOT, '.stc-baseline.json');

const GATED = { D1: '读者不知道主语是谁', G7: '口号代替了事实' };
const DEFAULT_TARGETS = ['docs', 'README.md', 'AGENTS.md', 'CONTRIBUTING.md'];

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')));
const targets = [];
let json = false;
let all = false;
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--target') targets.push(argv[(i += 1)]);
  else if (a === '--json') json = true;
  else if (a === '--all') all = true;
}
const update = flags.has('--update');
const checkTargets = targets.length > 0 ? targets : DEFAULT_TARGETS.filter((t) => existsSync(path.join(ROOT, t)));

// 一次跑完所有目标：检查器自己会跳过 . 开头的目录与 site / node_modules。
const run = spawnSync(
  process.execPath,
  [CLI, 'check', ...checkTargets, '--profile', 'for-document', '--json'],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);

let report;
try {
  const start = run.stdout.indexOf('{');
  report = JSON.parse(run.stdout.slice(start));
} catch {
  console.error('STC 检查器没有返回可解析的 JSON。原始输出：');
  console.error(run.stdout.slice(0, 2000) || run.stderr.slice(0, 2000));
  process.exit(2);
}

/** { "docs/x.md": { D1: 3, G7: 1 } } */
const counts = {};
const issues = [];
for (const file of report.files ?? []) {
  const rel = path.relative(ROOT, path.resolve(ROOT, file.path)).split(path.sep).join('/');
  // 只查正文页：字体许可之类的 .txt、图片目录里的说明不进这道门。
  if (!rel.endsWith('.md') || rel.startsWith('docs/assets/')) continue;
  for (const issue of file.issues ?? []) {
    if (!all && !(issue.rule in GATED)) continue;
    if (all && !(issue.rule in GATED)) continue;
    counts[rel] ??= {};
    counts[rel][issue.rule] = (counts[rel][issue.rule] ?? 0) + 1;
    issues.push({ file: rel, ...issue });
  }
}

const baseline = existsSync(BASELINE_FILE) ? JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) : { counts: {} };

if (update) {
  const sorted = {};
  for (const key of Object.keys(counts).sort()) sorted[key] = counts[key];
  const payload = {
    note: 'STC 回归基线：只统计 D1（代词主语）与 G7（口号代替事实）。清理页面后请重跑 node scripts/check-stc.mjs --update。',
    rules: GATED,
    generated: new Date().toISOString().slice(0, 10),
    counts: sorted,
  };
  writeFileSync(BASELINE_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const total = Object.values(sorted).reduce((n, r) => n + Object.values(r).reduce((a, b) => a + b, 0), 0);
  console.log(`已写基线 ${path.relative(ROOT, BASELINE_FILE)}：${Object.keys(sorted).length} 个文件、${total} 处存量。`);
  process.exit(0);
}

const regressions = [];
let grandTotal = 0;
for (const [file, rules] of Object.entries(counts)) {
  for (const [rule, n] of Object.entries(rules)) {
    grandTotal += n;
    const before = baseline.counts?.[file]?.[rule] ?? 0;
    if (n > before) regressions.push({ file, rule, n, before });
  }
}

if (json) {
  console.log(JSON.stringify({ targets: checkTargets, total: grandTotal, regressions, issues }, null, 2));
} else if (regressions.length > 0) {
  const files = new Set(regressions.map((r) => r.file)).size;
  console.error(`\nSTC 门未通过：${files} 个文件新增命中（共 ${regressions.length} 处）。\n`);
  for (const { file, rule, n, before } of regressions) {
    console.error(`  ${file}  ${rule}（${GATED[rule]}）${before} → ${n}`);
    for (const issue of issues.filter((i) => i.file === file && i.rule === rule)) {
      console.error(`    第 ${issue.line} 行第 ${issue.col} 列：${issue.context.replace(/\s+/g, ' ').slice(0, 70)}`);
      if (issue.suggestion) console.error(`      建议：${issue.suggestion}`);
    }
  }
  console.error('\n改法：把「它 / 他们」换成明确名称；把「不是 X，而是 Y」改成直陈事实。');
  console.error('改完若确认是新基线（例如整体重排后数量变了），跑 node scripts/check-stc.mjs --update。\n');
} else {
  console.log(`STC 门通过：没有新增 ${Object.keys(GATED).join(' / ')} 命中（全库现有 ${grandTotal} 处存量，见 .stc-baseline.json）。`);
}

process.exit(regressions.length > 0 ? 1 : 0);
