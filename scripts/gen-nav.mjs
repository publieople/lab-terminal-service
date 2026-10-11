// 导航生成器：从目录树（含 front-matter 标题）生成三份导航，避免它们各自漂移。
//
//   1. mkdocs.yml        —— 站点的 nav 块（# >>> gen:nav 与 # <<< gen:nav 之间）
//   2. nav.片段.yml       —— 并入实验室主书时粘贴的部门子树
//   3. SUMMARY.md        —— GitBook 目录
//
// 导航显示名取页面的 front-matter `title`（取不到就用文件名去掉序号），
// 顺序按目录名的两位序号，序号只影响排序、不出现在导航里。
// docs/归档/ 不进导航。
//
// 用法：node scripts/gen-nav.mjs [--check]

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, parseFrontMatter, cmpNames, stripNum, titleOf } from './lib/docs.mjs';

const DOCS = 'docs';
const DEPT = `${DOCS}/部门/终端服务部`;
const LINES = ['学习', '参考', '项目', '经验', '历史与交接'];
const MGMT = ['README.md', '招新介绍.md', '职责与服务目录.md', '待补事实.md'];
const SKIP_DIRS = new Set(['归档', 'assets']);
const check = process.argv.includes('--check');

function fmOf(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return {};
  const { data } = parseFrontMatter(fs.readFileSync(abs, 'utf8'));
  return data || {};
}
const labelOf = (rel) => titleOf(rel, fmOf(rel));

/** 目录 → 节点：README 作为第一个子项，其余子目录递归，子文件按序号排。 */
function dirNode(relDir) {
  const absDir = path.join(ROOT, relDir);
  const children = [];
  const readmeRel = `${relDir}/README.md`;
  if (fs.existsSync(path.join(ROOT, readmeRel))) children.push({ label: labelOf(readmeRel), path: readmeRel });
  const entries = fs
    .readdirSync(absDir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') && e.name !== 'assets' && e.name !== 'README.md');
  const dirs = entries.filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name)).sort((a, b) => cmpNames(a.name, b.name));
  const files = entries.filter((e) => !e.isDirectory() && e.name.endsWith('.md')).sort((a, b) => cmpNames(a.name, b.name));
  for (const d of dirs) children.push(dirNode(`${relDir}/${d.name}`));
  for (const f of files) {
    const rel = `${relDir}/${f.name}`;
    children.push({ label: labelOf(rel), path: rel });
  }
  const own = fs.existsSync(path.join(ROOT, readmeRel)) ? labelOf(readmeRel) : stripNum(path.basename(relDir));
  return { label: own, children };
}

function buildTree() {
  const tree = [{ label: labelOf(`${DOCS}/index.md`), path: `${DOCS}/index.md` }];

  const dept = dirNode(DEPT);
  const ordered = [];
  for (const m of MGMT) {
    if (m === 'README.md') continue; // 部门介绍已作为 README 进入 dept.children[0]
    const rel = `${DEPT}/${m}`;
    if (fs.existsSync(path.join(ROOT, rel))) ordered.push({ label: labelOf(rel), path: rel });
  }
  const readmeChild = dept.children.find((c) => c.path === `${DEPT}/README.md`);
  const rest = dept.children.filter((c) => c !== readmeChild);
  const lineNodes = LINES.map((l) => rest.find((c) => c.label === labelOf(`${DEPT}/${l}/README.md`) || (c.children && c.children.some((x) => x.path === `${DEPT}/${l}/README.md`)))).filter(Boolean);
  const others = rest.filter((c) => !lineNodes.includes(c) && !ordered.includes(c));
  dept.children = [readmeChild, ...ordered, ...lineNodes, ...others].filter(Boolean);
  tree.push(dept);

  const specDir = `${DOCS}/规范`;
  const specFiles = fs
    .readdirSync(path.join(ROOT, specDir))
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => (a === '知识库规范.md' ? -1 : b === '知识库规范.md' ? 1 : a < b ? -1 : 1));
  tree.push({ label: '规范', children: specFiles.map((f) => ({ label: labelOf(`${specDir}/${f}`), path: `${specDir}/${f}` })) });

  return tree;
}

const q = (s) => `"${String(s).replace(/"/g, '')}"`;

// mkdocs 的 nav 路径相对于 docs_dir，GitBook 的 SUMMARY.md 相对于仓库根。
const docsRel = (p) => p.replace(/^docs\//, '');

function yaml(node, indent, tf) {
  const pad = ' '.repeat(indent);
  if (node.path) return `${pad}- ${q(node.label)}: ${tf(node.path)}`;
  return [`${pad}- ${q(node.label)}:`, ...node.children.map((c) => yaml(c, indent + 4, tf))].join('\n');
}

function md(node, depth) {
  const pad = '  '.repeat(depth);
  if (node.path) return `${pad}* [${node.label}](${node.path})`;
  return [`${pad}* ${node.label}`, ...node.children.map((c) => md(c, depth + 1))].join('\n');
}

const tree = buildTree();
const deptNode = tree.find((n) => n.children && n.label === dirNode(DEPT).label);

// ── 1. mkdocs.yml 的 nav 块 ─────────────────────────────────────────────
const navLines = ['  # >>> gen:nav', ...tree.map((n) => yaml(n, 2, docsRel)), '  # <<< gen:nav'].join('\n');
const ymlPath = path.join(ROOT, 'mkdocs.yml');
const ymlLines = fs.readFileSync(ymlPath, 'utf8').split('\n');
const navAt = ymlLines.findIndex((l) => l.trim() === 'nav:');
if (navAt < 0) {
  console.error('❌ mkdocs.yml 里找不到 nav:');
  process.exit(1);
}
let navEnd = navAt + 1;
while (navEnd < ymlLines.length && (ymlLines[navEnd].trim() === '' || /^\s/.test(ymlLines[navEnd]))) navEnd++;
const ymlNew = [...ymlLines.slice(0, navAt + 1), ...navLines.split('\n'), ...ymlLines.slice(navEnd)].join('\n');

// ── 2. nav.片段.yml ────────────────────────────────────────────────────
const fragHeader = `# 终端服务部章节的导航片段
#
# 本文件由 scripts/gen-nav.mjs 生成，请勿手改；改完跑 node scripts/gen-nav.mjs。
#
# 用法：把下面整段（从 \`- 终端服务部:\` 到文件末尾）粘贴到实验室主书
#      mkdocs.yml 的 nav: 里，位置就是你想让这一章出现的位置。
#
# 前提：docs/部门/终端服务部/ 整棵目录已按《并入主书说明》拷进主书。
#       章内所有链接都是相对路径，粘完即生效，不需要改任何页面。
#
# 层次说明：主书里的 nav 只到这里截止。再往下的页面（真实服务器地址、
#          账号与凭据位置等）属于内部库，不公开。
`;
const fragNew = `${fragHeader}\n${yaml(deptNode, 0, docsRel)}\n`;

// ── 3. SUMMARY.md ──────────────────────────────────────────────────────
const summaryNew = `# Summary\n\n${tree.map((n) => md(n, 0)).join('\n')}\n`;

const outputs = [
  [ymlPath, ymlNew, 'mkdocs.yml'],
  [path.join(ROOT, 'nav.片段.yml'), fragNew, 'nav.片段.yml'],
  [path.join(ROOT, 'SUMMARY.md'), summaryNew, 'SUMMARY.md'],
];

let stale = 0;
for (const [file, content, name] of outputs) {
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (old === content) continue;
  stale++;
  if (check) console.log(`  ✗ 导航已过期：${name}`);
  else {
    fs.writeFileSync(file, content);
    console.log(`  ✓ 导航已更新：${name}`);
  }
}
if (check && stale) {
  console.log(`\n❌ ${stale} 份导航与目录树不一致，请跑 node scripts/gen-nav.mjs`);
  process.exit(1);
}
console.log(stale ? `导航更新 ${stale} 份` : '三份导航都是最新的');
