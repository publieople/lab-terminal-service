// 全库共用的小工具：front-matter 解析、目录遍历、排序、一句话摘要。
// 只依赖 node 内置模块。被 gen-index / gen-nav / check-pages / new 共用。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 递归列出目录下所有 .md（绝对路径），按路径排序。 */
export function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out);
    else if (e.name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

/**
 * 解析 front-matter。只支持本库用到的 YAML 子集：
 *   key: 标量            key: "带引号的值"        key: [a, b, c]
 * 不支持多行折叠、嵌套对象——规范里也不允许。
 * 返回 { data, raw, body, text }；没有 front-matter 时 data 为 null。
 */
export function parseFrontMatter(text) {
  if (!text.startsWith('---')) return { data: null, raw: '', body: text, text };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { data: null, raw: '', body: text, text };
  const raw = text.slice(3, end);
  const afterClose = text.indexOf('\n', end + 1);
  const body = afterClose < 0 ? '' : text.slice(afterClose + 1);
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^([^:#][^:]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].trim();
    const v = m[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      data[key] = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      data[key] = v.replace(/^["']|["']$/g, '');
    }
  }
  return { data, raw, body, text };
}

/** 读入一批目录（仓库相对路径）下的所有页面。 */
export function loadPages(dirs) {
  const pages = [];
  for (const d of dirs) {
    for (const abs of walkMd(path.join(ROOT, d))) {
      const rel = path.relative(ROOT, abs).split(path.sep).join('/');
      const parsed = parseFrontMatter(fs.readFileSync(abs, 'utf8'));
      pages.push({ abs, rel, ...parsed });
    }
  }
  return pages.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}

/** 索引表用的一句话：优先 front-matter 的 `一句话`，否则取正文第一段。 */
export function oneLine(page, max = 48) {
  const explicit = page.data && page.data['一句话'];
  if (explicit) return explicit;
  const buf = [];
  for (const line of (page.body || '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t) {
      if (buf.length) break;
      continue;
    }
    if (/^(#|>|<!--|\||```|---|\*\s|\-\s)/.test(t)) continue;
    buf.push(t);
    if (buf.join('').length > max) break;
  }
  let s = buf
    .join(' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim();
  if (s.length > max) s = s.slice(0, max - 1) + '…';
  return s || '—';
}

/** 从文件 A 指向文件 B 的相对链接（都传仓库相对路径）。 */
export function relLink(fromRel, toRel) {
  return path.relative(path.posix.dirname(fromRel), toRel).split(path.sep).join('/');
}

/** 排序键：带两位序号的排前面并按数字排，其余按名字排。 */
export function cmpNames(a, b) {
  const ka = sortKey(a);
  const kb = sortKey(b);
  for (let i = 0; i < 3; i++) {
    if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
  }
  return 0;
}
function sortKey(name) {
  const m = /^(\d+)[-_．.\s]*(.*)$/.exec(name);
  return m ? [0, Number(m[1]), m[2]] : [1, 0, name];
}

/** 去掉名字前面的序号前缀，用于显示。 */
export function stripNum(name) {
  return name.replace(/^\d+[-_．.\s]*/, '');
}

/** 页面标题：front-matter 的 title，退回到文件名。 */
export function titleOf(rel, data) {
  if (data && data.title) return data.title;
  return stripNum(path.basename(rel, '.md'));
}
