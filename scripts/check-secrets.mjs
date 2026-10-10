/**
 * scripts/check-secrets.mjs —— 公开仓库的"内网信息 + 凭据"正则兜底扫描
 *
 * 用法：
 *   node scripts/check-secrets.mjs
 *
 * 扫描范围：`docs/**\/*`（只读文本类文件）与仓库根目录的 `*.md`；
 * 跳过 `site/`、`.venv/`、`node_modules/`、`.git/`。
 * 与 `.gitleaks.toml` 的分工：gitleaks 是 CI 上的正式闸门（带熵值判断、带历史扫描），
 * 这个脚本是**本地提交前的同一套规则的轻量兜底**，规则互相呼应、不重复造轮子。
 *
 * ⚠️ 这只是正则兜底。它扫不出"实验室 433 房间的某台服务器""上个月离职那位同学的账号"
 *    这类只有人才能判断的信息。**PR Review 必须人工再过一遍**，不能因为脚本绿了就放行。
 *
 * ⚠️ **图片是彻底的盲区。** 本脚本只读 TEXT_EXT 里的文本后缀，png / jpg / pdf 一律跳过。
 *    而一张整屏截图恰恰什么都带：终端提示符里的主机名与用户名、`~/.ssh` 里的私钥文件名、
 *    标题栏与命令行里的路径、浏览器标签页里的内网地址、桌面上的文件与快捷方式。
 *    **这些正则一条都扫不到。** 所以：截图入库前**先自己看一眼再打码**（主机名 / 用户名 /
 *    路径 / 地址 / 群名 / 房号），能改写成命令行文本块的就别放截图；确实要放，只截需要的那一小块。
 *
 * 零依赖：只用 Node 内置模块。命中时退出码 1。
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');

const SKIP_DIRS = new Set(['site', '.venv', 'node_modules', '.git', '.cache', 'dist', 'build']);

/** 只扫这些后缀的文本文件；其余（png、jpg、pdf、zip…）跳过 —— 图片里的主机名 / 用户名 / 路径扫不到，见文件头「图片是彻底的盲区」。 */
const TEXT_EXT = new Set([
  '.md',
  '.markdown',
  '.mdx',
  '.txt',
  '.yml',
  '.yaml',
  '.json',
  '.jsonc',
  '.csv',
  '.tsv',
  '.ps1',
  '.psm1',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.mjs',
  '.cjs',
  '.js',
  '.ts',
  '.py',
  '.html',
  '.htm',
  '.css',
  '.toml',
  '.ini',
  '.cfg',
  '.conf',
  '.env',
  '.example',
  '.properties',
  '.xml',
  '.sql',
  '.log',
]);

/** 单文件大小上限：超过就不读（正常文档不会有 2 MB）。 */
const MAX_BYTES = 2 * 1024 * 1024;

/* ------------------------------------------------------------------ *
 * 规则
 * ------------------------------------------------------------------ */

/**
 * 口令/密钥赋值：值不能是占位符、中文说明、纯打码。
 * 单独写是因为它需要看捕获组，不能只靠"命中整行"。
 */
const ASSIGN_RE =
  /(?<![A-Za-z0-9_])(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)[ \t]*[:=][ \t]*["']?([^\s"',;]{4,})/gi;

function assignmentLooksReal(value) {
  if (/[\u4e00-\u9fff]/.test(value)) return false; // 中文说明文字
  if (/^[<（(【\[]/.test(value)) return false; // 占位符
  if (/^[*xX.\-…·_=]+$/.test(value)) return false; // 打码
  if (/^(?:true|false|null|none|nil|redacted|hidden|removed|change[_-]?me|your|xxx+)$/i.test(value)) return false;
  return true;
}

const RULES = [
  {
    name: '内网IPv4（RFC1918）',
    re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
  },
  {
    name: '组网IPv4（100.64.0.0/10）',
    re: /\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/g,
  },
  {
    name: 'tailnet域名（*.ts.net）',
    re: /\b[a-z0-9][a-z0-9-]*\.ts\.net\b/gi,
  },
  {
    name: 'JWT',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  {
    name: 'sk-密钥',
    re: /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    name: 'Bearer令牌',
    re: /\bBearer[ \t]+[A-Za-z0-9._~+/-]{16,}=*/gi,
  },
  {
    name: '口令/密钥赋值',
    re: ASSIGN_RE,
    verify: (m) => assignmentLooksReal(m[1] ?? ''),
  },
  {
    name: '私钥块',
    re: /-----BEGIN [A-Z0-9 ]{0,40}PRIVATE KEY-----/g,
  },
];

/**
 * 允许清单（命中整段落在这些形态里就不报）。
 * 尖括号占位符走的是"扫描前先挖空"的路子，不在这里列。
 */
const ALLOW = [
  /\b(?:192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}\b/, // RFC5737 文档专用网段
  /\b127\.0\.0\.1\b/,
  /\b0\.0\.0\.0\b/,
  /publieople\.github\.io/,
  /github\.com\/publieople/,
  /example\.(?:com|org|net)/,
  /raw\.githubusercontent\.com/,
  /creativecommons\.org/,
  /\blocalhost\b/,
];

const isAllowed = (text) => ALLOW.some((re) => re.test(text));

/** 命中片段打码：绝不原样打印密钥。 */
function mask(text) {
  const s = String(text);
  if (s.length <= 4) return '****';
  if (s.length <= 12) return `${s.slice(0, 3)}***${s.slice(-1)}`;
  return `${s.slice(0, 4)}***${s.slice(-2)}`;
}

/** 把 `<内网IP>` `<服务器>` `<你的GitHub用户名>` 这类占位符挖成等长空格，避免误报，同时不打乱列号。 */
function blankPlaceholders(line) {
  return line.replace(/<[^<>\n]{0,60}>/g, (m) => ' '.repeat(m.length));
}

/* ------------------------------------------------------------------ *
 * 扫描
 * ------------------------------------------------------------------ */

async function walk(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') return found;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...(await walk(full)));
    } else if (entry.isFile()) {
      found.push(full);
    }
  }
  return found;
}

async function collectTargets() {
  const targets = [];

  for (const file of await walk(DOCS_DIR)) {
    if (!TEXT_EXT.has(path.extname(file).toLowerCase())) continue;
    targets.push(file);
  }

  // 仓库根目录的 *.md（README / CONTRIBUTING / SCHEMA / 并入主书说明 …）
  let rootEntries = [];
  try {
    rootEntries = await readdir(REPO_ROOT, { withFileTypes: true });
  } catch {
    rootEntries = [];
  }
  for (const entry of rootEntries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) targets.push(path.join(REPO_ROOT, entry.name));
  }

  const unique = [...new Set(targets)];
  unique.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return unique;
}

function rel(p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join('/');
}

async function readTextFile(file) {
  let info;
  try {
    info = await stat(file);
  } catch {
    return null;
  }
  if (!info.isFile() || info.size > MAX_BYTES) return null;
  let buffer;
  try {
    buffer = await readFile(file);
  } catch {
    return null;
  }
  if (buffer.includes(0)) return null; // 有 NUL 字节：当作二进制，跳过
  return buffer.toString('utf8');
}

function scanText(text) {
  const hits = [];
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw) continue;
    const masked = blankPlaceholders(raw);
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(masked)) !== null) {
        if (m.index === rule.re.lastIndex) rule.re.lastIndex += 1; // 零宽匹配保护
        if (rule.verify && !rule.verify(m)) continue;
        if (isAllowed(m[0])) continue;
        hits.push({ line: i + 1, rule: rule.name, sample: mask(m[0]) });
      }
    }
  }
  return hits;
}

async function main() {
  const files = await collectTargets();
  const all = [];
  const perRule = new Map();

  for (const file of files) {
    const text = await readTextFile(file);
    if (text === null) continue;
    const hits = scanText(text);
    if (!hits.length) continue;
    const display = rel(file);
    for (const hit of hits) {
      all.push({ display, ...hit });
      perRule.set(hit.rule, (perRule.get(hit.rule) ?? 0) + 1);
    }
  }

  if (all.length === 0) {
    process.stdout.write(`扫描了 ${files.length} 个文件。\n`);
    process.stdout.write('⚠️  提醒：正则只能挡住"写得出形状"的信息；房号、设备归属、人员、以及截图里的主机名与路径这类要靠 Review 人工判断。\n');
    process.stdout.write('✅ 未发现疑似敏感信息\n');
    process.exit(0);
  }

  for (const hit of all) {
    process.stdout.write(`${hit.display}:${hit.line}  ${hit.rule}  ${hit.sample}\n`);
  }
  process.stdout.write('\n命中统计：\n');
  for (const [name, count] of [...perRule.entries()].sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`  ${name} × ${count}\n`);
  }
  process.stdout.write('\n⚠️  提醒：正则只能挡住"写得出形状"的信息；房号、设备归属、人员、以及截图里的主机名与路径这类要靠 Review 人工判断。\n');
  process.stdout.write('   处理方法见 CONTRIBUTING.md §2.3：换成 <内网IP> / <设备名> / <域名> 这类占位符，凭据永不入库。\n');
  process.stdout.write(`❌ 发现 ${all.length} 处疑似敏感信息（扫描了 ${files.length} 个文件）\n`);
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`❌ 脚本自身出错：${err && err.stack ? err.stack : String(err)}\n`);
  process.exit(2);
});
