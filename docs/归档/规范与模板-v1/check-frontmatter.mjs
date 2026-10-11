/**
 * scripts/check-frontmatter.mjs —— 校验 docs/ 下每一页的 front-matter 与必填章节
 *
 * 用法：
 *   node scripts/check-frontmatter.mjs
 *
 * 规则来源：`_schema/frontmatter.json`（由模板/schema 维护者提供）。
 * 该文件不存在、读不动、或结构与预期不同时，**逐项回落到本文件里的内置默认规则**，
 * 不会因为 schema 换了个形状就崩掉。
 *
 * 校验两件事：
 *   1. front-matter：必填字段、枚举取值、日期格式（SCHEMA.md §3）
 *   2. 正文必填章节：按 type 检查逐字标题（SCHEMA.md §4）
 *      —— `docs/规范/文档写入规范.md` 是外部导入件，只校 front-matter，不校章节。
 *      —— 各内容类的 `README.md` 是索引页，结构是「总览 + 清单」，不套该类正文的必填章节。
 *         这条豁免按路径模式匹配（`_schema/frontmatter.json` 的 `skipSections`，支持 `*`）。
 *
 * 零依赖：只用 Node 内置模块；自己递归遍历目录（不用实验性的 fs.globSync）。
 * 输出：`文件:行号  问题`，最后一行汇总；有问题时退出码 1。
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const SCHEMA_FILE = path.join(REPO_ROOT, '_schema', 'frontmatter.json');

/** 目录级跳过：这些目录不是"内容"。 */
const SKIP_DIRS = new Set(['site', '.venv', 'node_modules', '.git', '.cache']);

/**
 * 内置默认规则（SCHEMA.md §3 / §4 的可执行副本）。
 * schema 文件里缺哪一项，就用这里的哪一项。
 */
const DEFAULTS = {
  required: ['title', 'type', '部门', '维护人', '更新', '状态', '可见性'],
  enums: {
    type: [
      '站点首页',
      '部门介绍',
      '基础知识',
      '技术模块',
      '学习课程',
      '项目实践',
      '技术经验',
      '历史与交接',
      '规范',
    ],
    状态: ['草稿', '可用', '待修订'],
    可见性: ['公开', '内部'],
  },
  patterns: {
    更新: '^\\d{4}-\\d{2}-\\d{2}$',
  },
  sections: {
    项目实践: [
      '一、项目概述',
      '二、项目目标',
      '三、技术路线',
      '四、开发环境',
      '五、硬件环境',
      '六、核心代码',
      '七、项目实现',
      '八、复现步骤',
      '九、项目成果',
      '十、已知问题',
      '十一、后续方向',
    ],
    学习课程: [
      '一、课程定位',
      '二、面向对象',
      '三、前置知识',
      '四、学习目标',
      '五、知识模块',
      '六、实践内容',
      '七、项目衔接',
    ],
    技术模块: [
      '一、技术是什么',
      '二、为什么使用',
      '三、工作原理',
      '四、使用环境',
      '五、基本使用',
      '六、实际应用',
      '七、常见问题',
      '八、延伸方向',
    ],
    技术经验: ['一、现象', '二、环境', '三、原因', '四、解决方案', '五、验证', '六、经验'],
  },
  /** 只校 front-matter、不校章节的文件（仓库内相对路径，用 `/`）。 */
  skipSections: ['docs/规范/文档写入规范.md'],
};

/* ------------------------------------------------------------------ *
 * 读取规则（防御性：形状不认识就回落默认值）
 * ------------------------------------------------------------------ */

function normalizeSectionList(value) {
  if (!Array.isArray(value)) return null;
  const out = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const t = item.replace(/^#{1,6}[ \t]*/, '').trim();
      if (t) out.push(t);
    } else if (item && typeof item === 'object' && typeof item.title === 'string') {
      const t = item.title.replace(/^#{1,6}[ \t]*/, '').trim();
      if (t) out.push(t);
    }
  }
  return out.length ? out : null;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return null;
  const out = value.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
  return out.length ? out : null;
}

function asEnumMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const list = Array.isArray(val) ? val : val && Array.isArray(val.values) ? val.values : null;
    if (!list) continue;
    const vals = list.filter((x) => typeof x === 'string' && x).map((x) => x);
    if (vals.length) out[key] = vals;
  }
  return Object.keys(out).length ? out : null;
}

function asPatternMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    let source = null;
    if (typeof val === 'string') source = val;
    else if (val instanceof RegExp) source = val.source;
    else if (val && typeof val === 'object' && typeof val.pattern === 'string') source = val.pattern;
    if (!source) continue;
    try {
      new RegExp(source);
      out[key] = source;
    } catch {
      /* 非法正则：忽略这条，回落默认值 */
    }
  }
  return Object.keys(out).length ? out : null;
}

function asSectionMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    const list = normalizeSectionList(val);
    if (list) out[key] = list;
  }
  return Object.keys(out).length ? out : null;
}

async function loadRules() {
  const rules = {
    required: DEFAULTS.required.slice(),
    enums: { ...DEFAULTS.enums },
    patterns: { ...DEFAULTS.patterns },
    sections: { ...DEFAULTS.sections },
    skipSections: DEFAULTS.skipSections.slice(),
  };
  const notes = [];

  let raw = null;
  try {
    raw = JSON.parse(await readFile(SCHEMA_FILE, 'utf8'));
  } catch (err) {
    raw = null;
    notes.push(
      err && err.code === 'ENOENT'
        ? '未找到 _schema/frontmatter.json，全部使用脚本内置的默认规则'
        : `_schema/frontmatter.json 读取或解析失败（${err && err.message}），使用内置默认规则`,
    );
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { rules, notes };

  // 允许规则挂在顶层，也允许挂在 fields / frontmatter / rules 这些常见包装下。
  const scopes = [raw, raw.fields, raw.frontmatter, raw.frontMatter, raw.rules].filter(
    (s) => s && typeof s === 'object' && !Array.isArray(s),
  );
  const first = (fn) => {
    for (const scope of scopes) {
      const got = fn(scope);
      if (got) return got;
    }
    return null;
  };

  const required = first((s) => asStringArray(s.required ?? s.requiredFields ?? s.required_fields));
  if (required) rules.required = required;

  const enums = first((s) => asEnumMap(s.enums ?? s.enum ?? s.allowedValues ?? s.allowed ?? s.choices));
  if (enums) rules.enums = { ...rules.enums, ...enums };

  const patterns = first((s) => asPatternMap(s.patterns ?? s.pattern ?? s.regex ?? s.regexps));
  if (patterns) rules.patterns = { ...rules.patterns, ...patterns };

  const sections = first((s) =>
    asSectionMap(s.sections ?? s.requiredSections ?? s.required_sections ?? s.sectionRules),
  );
  if (sections) rules.sections = { ...rules.sections, ...sections };

  const skip = first((s) => asStringArray(s.skipSections ?? s.skip_sections ?? s.sectionsSkip ?? s.skip));
  if (skip) rules.skipSections = skip;

  return { rules, notes };
}

/* ------------------------------------------------------------------ *
 * front-matter 解析（逐行，不引 yaml 库）
 * ------------------------------------------------------------------ */

function splitLines(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

function unquote(value) {
  let v = value.trim();
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    v = v.slice(1, -1).trim();
  }
  // YAML 行内注释：` #` 之后的都算注释（`#` 前面必须有空白）
  v = v.replace(/[ \t]+#.*$/, '').trim();
  return v;
}

/**
 * 返回 { ok, lines, fields:Map<key,{value,line,list}>, body, typeLine }
 * 只支持 `key: value`、`key: [a, b]`、JSON 数组、以及块状 `- ` 数组。
 */
function parseFrontMatter(text) {
  const lines = splitLines(text);
  if (lines.length === 0 || lines[0].trim() !== '---') return { ok: false, lines };
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (t === '---' || t === '...') {
      end = i;
      break;
    }
  }
  if (end === -1) return { ok: false, lines };

  const fields = new Map();
  let currentKey = null;
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = /^([^\s][^:]*?)[ \t]*:[ \t]*(.*)$/.exec(line);
    if (m) {
      const key = m[1].trim();
      currentKey = key;
      fields.set(key, { value: m[2].trim(), line: i + 1, list: null });
    } else if (/^[ \t]*[-*][ \t]+/.test(line) && currentKey) {
      const f = fields.get(currentKey);
      if (f) {
        f.list = f.list || [];
        f.list.push(line.trim().replace(/^[-*][ \t]+/, '').trim());
      }
    }
  }
  return {
    ok: true,
    lines,
    fields,
    body: lines.slice(end + 1).join('\n'),
    typeLine: fields.get('type')?.line ?? 1,
  };
}

/* ------------------------------------------------------------------ *
 * 正文章节检查
 * ------------------------------------------------------------------ */

/** 去掉围栏代码块：写在 ```text 里的模板标题不算真的章节。 */
function stripFences(text) {
  const out = [];
  let fence = null;
  for (const line of text.split('\n')) {
    const m = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const t = line.trim();
      if (m && t[0] === fence[0] && /^[`~]+$/.test(t) && t.length >= fence.length) fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function hasHeading(bodyText, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 允许 ## 或 ### 前缀，允许标题后带空格（以及 ATX 的收尾 #）
  const re = new RegExp(`^#{2,3}[ \\t]*${escaped}[ \\t]*#*[ \\t]*$`, 'm');
  return re.test(bodyText);
}

/* ------------------------------------------------------------------ *
 * 主流程
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
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      found.push(full);
    }
  }
  return found;
}

function rel(p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join('/');
}

/**
 * 极简 glob：只支持星号，且星号 **不跨斜杠**。
 * 用来匹配 `skipSections` 里的模式，例如 `docs/部门` + 星号 + `/技术模块/README.md`。
 * 不含星号的模式退化为精确比较。
 */
function globMatch(pattern, value) {
  const p = pattern.replace(/\\/g, '/');
  if (!p.includes('*')) return p === value;
  const escapeRe = (part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = p.split('*').map(escapeRe).join('[^/]*');
  return new RegExp('^' + body + '$').test(value);
}

function checkFile(display, text, rules) {
  const problems = [];
  // 章节豁免：模式里的 `*` 匹配任意一段路径（不跨 `/`）。
  const skipSections = rules.skipSections.map((p) => String(p).replace(/\\/g, '/'));
  const isSectionExempt = (file) => skipSections.some((pattern) => globMatch(pattern, file));

  const fm = parseFrontMatter(text);
  if (!fm.ok) {
    problems.push({ line: 1, msg: '缺少 front-matter：文件第一行必须是 `---`，并在下方用 `---` 收尾' });
    return problems;
  }

  for (const key of rules.required) {
    const field = fm.fields.get(key);
    if (!field) {
      problems.push({ line: 1, msg: `缺少必填字段 \`${key}\`` });
      continue;
    }
    const value = unquote(field.value);
    if (value === '' && !field.list) {
      problems.push({ line: field.line, msg: `字段 \`${key}\` 为空值` });
      continue;
    }
    const allowed = rules.enums[key];
    if (allowed && value !== '' && !allowed.includes(value)) {
      problems.push({
        line: field.line,
        msg: `字段 \`${key}\` 取值非法：\`${value}\`（允许：${allowed.join(' / ')}）`,
      });
    }
    const pattern = rules.patterns[key];
    if (pattern && value !== '') {
      let re = null;
      try {
        re = new RegExp(pattern);
      } catch {
        re = null;
      }
      if (re && !re.test(value)) {
        problems.push({ line: field.line, msg: `字段 \`${key}\` 格式不符：\`${value}\`（要求匹配 ${pattern}）` });
      }
    }
  }

  // 正文必填章节
  const type = unquote(fm.fields.get('type')?.value ?? '');
  const requiredSections = rules.sections[type];
  if (requiredSections && requiredSections.length && !isSectionExempt(display)) {
    const body = stripFences(fm.body);
    for (const title of requiredSections) {
      if (!hasHeading(body, title)) {
        problems.push({
          line: fm.typeLine,
          msg: `type: ${type} 缺少必填章节 \`## ${title}\`（标题要逐字，允许 ## 或 ###）`,
        });
      }
    }
  }

  problems.sort((a, b) => a.line - b.line);
  return problems;
}

async function main() {
  const { rules, notes } = await loadRules();
  for (const note of notes) process.stderr.write(`ℹ️  ${note}\n`);

  const files = (await walk(DOCS_DIR)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (files.length === 0) {
    process.stdout.write('ℹ️  在 docs/ 下没有找到任何 .md 文件（docs/ 可能还没有内容）\n');
    process.stdout.write('✅ 全部 0 个文件通过\n');
    process.exit(0);
  }

  let failedFiles = 0;
  let totalProblems = 0;
  for (const file of files) {
    let text;
    try {
      text = await readFile(file, 'utf8');
    } catch (err) {
      const display = rel(file);
      process.stdout.write(`${display}:1  读取失败：${err && err.message}\n`);
      failedFiles += 1;
      totalProblems += 1;
      continue;
    }
    const display = rel(file);
    const problems = checkFile(display, text, rules);
    if (problems.length === 0) continue;
    failedFiles += 1;
    totalProblems += problems.length;
    for (const p of problems) {
      process.stdout.write(`${display}:${p.line}  ${p.msg}\n`);
    }
  }

  if (totalProblems === 0) {
    process.stdout.write(`✅ 全部 ${files.length} 个文件通过\n`);
    process.exit(0);
  }
  process.stdout.write(`❌ ${failedFiles} 个文件有 ${totalProblems} 处问题\n`);
  process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`❌ 脚本自身出错：${err && err.stack ? err.stack : String(err)}\n`);
  process.exit(2);
});
