// 索引表生成器。
//
// 索引页（各类 README、章节导览）里放一对标记，本脚本只重写标记之间的内容：
//
//   <!-- gen:index 课程 学习/01-Windows基础 -->    ← 列出该路径下 type=课程 的页面
//   ...生成内容...
//   <!-- /gen:index -->
//
//   <!-- gen:index 目录 学习 -->                    ← 列出该目录的直接子目录与子文件
//   ...生成内容...
//   <!-- /gen:index -->
//
// 表格列固定为：名称 / 一句话 / 难度 / 状态 / 更新。
// 一句话优先取 front-matter 的 `一句话`，没有就取正文第一段。
//
// 用法：node scripts/gen-index.mjs [--check]
//   --check 时只报告哪些索引页需要重新生成，不写文件（CI 用）。

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadPages, parseFrontMatter, oneLine, relLink, cmpNames, titleOf } from './lib/docs.mjs';
import { fileURLToPath } from 'node:url';

const DEPT = 'docs/部门/终端服务部/';
const HEAD = '| 名称 | 一句话 | 难度 | 状态 | 更新 |\n| --- | --- | --- | --- | --- |';
const MARKER = /<!--\s*gen:index\s+(\S+)(?:\s+([^>]*?))?\s*-->([\s\S]*?)<!--\s*\/gen:index\s*-->/g;
const check = process.argv.includes('--check');

const pages = loadPages(['docs']);
const byRel = new Map(pages.map((p) => [p.rel, p]));

function row(linkText, linkTarget, page) {
  const d = (page && page.data) || {};
  return `| [${linkText}](${linkTarget}) | ${page ? oneLine(page) : '—'} | ${d['难度'] || '—'} | ${d['状态'] || '—'} | ${d['更新'] || '—'} |`;
}

/** 类型模式：列出 prefix 下所有该 type 的页面，按路径（序号优先）排序。 */
function tableByType(indexRel, type, scope) {
  const prefix = DEPT + (scope ? scope.replace(/\/+$/, '') + '/' : '');
  const rows = pages
    .filter((p) => p.data && p.data.type === type && p.rel !== indexRel && p.rel.startsWith(prefix))
    .sort((a, b) => cmpNames(a.rel, b.rel));
  if (!rows.length) return `${HEAD}\n| _还没有页面_ | — | — | — | — |`;
  return [HEAD, ...rows.map((p) => row(titleOf(p.rel, p.data), relLink(indexRel, p.rel), p))].join('\n');
}

/** 目录模式：列出该目录的直接子目录（读它的 README.md）与直接子文件。 */
function tableByDir(indexRel, scope) {
  const absDir = path.join(ROOT, DEPT, scope || '');
  if (!fs.existsSync(absDir)) return `${HEAD}\n| _目录不存在：${scope}_ | — | — | — | — |`;
  const entries = [];
  for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'assets') continue;
    if (e.isDirectory()) {
      const readmeRel = `${DEPT}${scope ? scope + '/' : ''}${e.name}/README.md`.replace(/\/+/g, '/');
      const readme = byRel.get(readmeRel);
      if (readme) entries.push({ key: e.name, rel: readmeRel, page: readme, label: titleOf(readmeRel, readme.data) });
    } else if (e.name.endsWith('.md') && e.name !== 'README.md') {
      const rel = `${DEPT}${scope ? scope + '/' : ''}${e.name}`.replace(/\/+/g, '/');
      const page = byRel.get(rel);
      const parsed = page || { ...parseFrontMatter(fs.readFileSync(path.join(absDir, e.name), 'utf8')), rel };
      entries.push({ key: e.name, rel, page: parsed, label: titleOf(rel, parsed.data) });
    }
  }
  entries.sort((a, b) => cmpNames(a.key, b.key));
  if (!entries.length) return `${HEAD}\n| _还没有页面_ | — | — | — | — |`;
  return [HEAD, ...entries.map((x) => row(x.label, relLink(indexRel, x.rel), x.page))].join('\n');
}

let stale = 0;
for (const page of pages) {
  if (!page.text.includes('gen:index')) continue;
  const updated = page.text.replace(MARKER, (full, type, scope) => {
    const s = (scope || '').trim();
    const body = type === '目录' ? tableByDir(page.rel, s) : tableByType(page.rel, type, s);
    return `<!-- gen:index ${type}${s ? ' ' + s : ''} -->\n${body}\n<!-- /gen:index -->`;
  });
  if (updated === page.text) continue;
  stale++;
  if (check) {
    console.log(`  ✗ 索引表已过期：${page.rel}`);
  } else {
    fs.writeFileSync(page.abs, updated);
    console.log(`  ✓ 索引表已更新：${page.rel}`);
  }
}
if (check && stale) {
  console.log(`\n❌ ${stale} 个索引页与 front-matter 不一致，请跑 node scripts/gen-index.mjs`);
  process.exit(1);
}
console.log(stale ? `索引页更新 ${stale} 个` : '所有索引表都是最新的');
