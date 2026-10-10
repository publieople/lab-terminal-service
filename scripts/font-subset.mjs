#!/usr/bin/env node
// 网站字体子集化：从 docs/ 里提取真正用到的字符，调用 pyftsubset 生成 woff2。
//
// 为什么需要它：中文 webfont 的完整文件是 17MB 级别（Noto Sans SC 可变字体、
// Maple Mono NF CN 单字重都是这个量级），直接自托管等于让访客下载十几兆。
// 只把实际出现的字符打进子集，才能既换字体又不拖慢站点。
//
// 用法（在仓库根目录）：
//   node scripts/font-subset.mjs                 # 用默认字体路径
//   node scripts/font-subset.mjs --keep-chars    # 保留中间生成的字符集文件
//
// 依赖：pip install fonttools brotli（woff2 需要 brotli）。
// 字体装在哪台机器上不重要，重要的是 fonttools 装在哪：
// 默认调 `python`，要指定解释器就设环境变量 PYTHON，例如
//   $env:PYTHON = '.\.venv\Scripts\python.exe'; node scripts\font-subset.mjs
//
// 注意：改了标题或代码块之后，字符集变了就要重新跑一次，否则新字会掉字。

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(repoRoot, 'docs');
const outDir = path.join(docsDir, 'assets', 'fonts');
const tmpDir = path.join(repoRoot, '_tmp', 'font-chars');
const windir = process.env.WINDIR || 'C:\\Windows';

// 字体源文件（本机安装位置）。换字体只改这里。
// newName 是子集化后写进字体内部的名称：子集属于 OFL 说的"修改版本"，
// 而这两款字体都声明了 Reserved Font Name（Maple Mono / Smiley / 得意黑），
// 修改版本不得沿用，所以这里必须改成别的名字，@font-face 也用这个名字。
const FONTS = [
  {
    id: 'smiley-sans',
    // 得意黑：只给 h1 用
    src: path.join(windir, 'Fonts', 'SmileySans-Oblique.ttf'),
    scope: 'h1',
    out: 'smiley-sans-h1.woff2',
    newName: 'Terminal Dept Display',
  },
  {
    id: 'maple-mono',
    // Maple Mono NF CN Regular：给代码块与行内代码用
    src: path.join(windir, 'Fonts', 'MapleMono-NF-CN-Regular.ttf'),
    scope: 'code',
    out: 'maple-mono-nf-cn-code.woff2',
    newName: 'Terminal Dept Mono',
  },
]

// 子集化后的改名：OFL 1.1 的 Reserved Font Name 条款要求修改版本换名，
// 否则就是拿着原作者的字体名发布改动过的文件。
const RENAME_PY = `
import sys
from fontTools.ttLib import TTFont
path, new = sys.argv[1], sys.argv[2]
font = TTFont(path)
names = {1: new, 3: new + '; subset', 4: new, 6: new.replace(' ', '-'), 16: new, 17: 'Regular'}
kept = [r for r in font['name'].names if r.nameID not in names]
font['name'].names = kept
for nid, value in names.items():
    font['name'].setName(value, nid, 3, 1, 0x409)
    font['name'].setName(value, nid, 1, 0, 0)
font.save(path)
print('已改名：' + path + ' → ' + new)
`;;

function walkMarkdown(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'site', '.venv', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// 拉丁字母、数字、常用标点总是带上：少一个就会在页面上掉成方框，
// 而这些字符对体积几乎没有影响。
const ALWAYS = (() => {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(String.fromCharCode(c));
  for (const ch of '·—…“”‘’「」『』（）《》〈〉、。，：；？！｜→←↑↓├└─│❯●▍\u00a0\u3000') set.add(ch);
  return set;
})();

function collectCharsets() {
  const h1 = new Set();
  const code = new Set();
  const files = walkMarkdown(docsDir);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = /^#\s+(.+?)\s*$/.exec(line);
      if (m) for (const ch of m[1]) h1.add(ch);
    }
    for (const block of text.match(/```[^\n]*\n[\s\S]*?```/g) || []) {
      for (const ch of block) code.add(ch);
    }
    for (const span of text.match(/`[^`\n]+`/g) || []) {
      for (const ch of span) code.add(ch);
    }
  }
  for (const set of [h1, code]) {
    for (const ch of ALWAYS) set.add(ch);
  }
  for (const set of [h1, code]) {
    set.delete('\n');
    set.delete('\r');
    set.delete('\t');
  }
  return { h1, code, fileCount: files.length };
}

function pyftsubset(src, charsetFile, outFile) {
  const args = [
    '-m', 'fontTools.subset',
    src,
    `--text-file=${charsetFile}`,
    '--flavor=woff2',
    '--layout-features=*',
    '--no-hinting',
    '--desubroutinize',
    `--output-file=${outFile}`,
  ];
  const r = spawnSync(process.env.PYTHON || 'python', args, { stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`pyftsubset 失败（退出码 ${r.status}）：${src}`);
}

function renameFont(outFile, newName) {
  const r = spawnSync(process.env.PYTHON || 'python', ['-c', RENAME_PY, outFile, newName], { stdio: 'inherit' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`改名失败（退出码 ${r.status}）：${outFile}`);
}

const keepChars = process.argv.includes('--keep-chars');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

const { h1, code, fileCount } = collectCharsets();
const sets = { h1, code };
console.log(`扫描 ${fileCount} 个 .md：h1 用字 ${h1.size} 个，代码用字 ${code.size} 个`);

for (const font of FONTS) {
  if (!fs.existsSync(font.src)) {
    console.error(`跳过 ${font.id}：找不到字体文件 ${font.src}`);
    process.exitCode = 1;
    continue;
  }
  const charsetFile = path.join(tmpDir, `${font.id}-chars.txt`);
  fs.writeFileSync(charsetFile, [...sets[font.scope]].join(''), 'utf8');
  const outFile = path.join(outDir, font.out);
  pyftsubset(font.src, charsetFile, outFile);
  renameFont(outFile, font.newName);
  const before = fs.statSync(font.src).size;
  const after = fs.statSync(outFile).size;
  const pct = ((after / before) * 100).toFixed(2);
  console.log(`${font.out}: ${(before / 1048576).toFixed(1)}MB → ${(after / 1024).toFixed(0)}KB（${pct}%）`);
}

if (!keepChars) fs.rmSync(tmpDir, { recursive: true, force: true });
else console.log(`字符集文件保留在 ${tmpDir}`);
