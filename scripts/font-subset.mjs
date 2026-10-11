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
  // 页面在站点上真正的大标题来自 front-matter 的 title，站点把它渲染成 h1。
  // 只扫 `# ` 标题行会漏掉这些字——漏掉的字不会报错，只是静默掉成系统字体，
  // 所以标题用字单独收一份，出字体后按它做覆盖检查。
  const titles = new Set();
  const files = walkMarkdown(docsDir);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    if (fm) {
      const t = /^title:\s*(.+?)\s*$/m.exec(fm[1]);
      if (t) {
        for (const ch of t[1].replace(/^["']|["']$/g, '')) {
          titles.add(ch);
          h1.add(ch);
        }
      }
    }
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
  return { h1, code, titles, fileCount: files.length };
}

// 覆盖检查：pyftsubset 只保证"我要的字符都打进去了"，不保证"我要的字符是对的"。
// 这份检查拿真正会渲染成大标题的字去问子集，缺字就报出来（只报码位，控制台编码不稳）。
const COVERAGE_PY = `
import sys
from fontTools.ttLib import TTFont
font_path, want = sys.argv[1], sys.argv[2]
cmap = TTFont(font_path).getBestCmap()
missing = sorted({ord(c) for c in want if ord(c) not in cmap})
print(','.join(hex(c) for c in missing))
`;

function checkCoverage(fontFile, want) {
  const r = spawnSync(process.env.PYTHON || 'python', ['-c', COVERAGE_PY, fontFile, [...want].join('')], { encoding: 'utf8' });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`覆盖检查失败：${fontFile}`);
  return (r.stdout || '').trim();
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

const { h1, code, titles, fileCount } = collectCharsets();
const sets = { h1, code };
console.log(`扫描 ${fileCount} 个 .md：h1 用字 ${h1.size} 个（其中标题 ${titles.size} 个），代码用字 ${code.size} 个`);

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
  const missing = checkCoverage(outFile, font.scope === 'h1' ? titles : sets[font.scope]);
  if (!missing) {
    console.log('  覆盖检查通过：该用的字都在子集里');
  } else if (font.scope === 'h1') {
    // 标题掉字是看得见的缺陷（一段标题里混进系统黑体），必须拦住。
    console.error(`  ！标题用字缺这些，页面上会掉成系统字体：${missing}`);
    process.exitCode = 1;
  } else {
    // 代码字体缺的通常是符号和 emoji（①②、✅、🟢 这类），源字体本来就没有，
    // 浏览器会顺着字体栈往下找系统字体渲染，观感可接受，所以只提示不拦。
    console.warn(`  提示：源字体没有这些字，会回退到系统字体渲染：${missing}`);
  }
}

if (!keepChars) fs.rmSync(tmpDir, { recursive: true, force: true });
else console.log(`字符集文件保留在 ${tmpDir}`);
