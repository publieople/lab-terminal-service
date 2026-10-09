/**
 * scripts/new.mjs —— 用模板新建一篇文档
 *
 * 用法：
 *   node scripts/new.mjs <类型> <目标路径>
 *   node scripts/new.mjs 技术模块 docs/部门/终端服务部/技术模块/Ansible批量配置
 *   node scripts/new.mjs 踩坑记录 docs/部门/终端服务部/技术经验/磁盘inode耗尽
 *
 * <目标路径> **不带 `.md` 后缀**，允许带子目录（会自动建目录）。
 * 脚本做三件事：复制模板 → 覆写 front-matter → 打印"下一步"。
 * 目标文件已存在时拒绝覆盖，退出码 1。
 *
 * 零依赖：只用 Node 内置模块（node:fs/promises、node:path、node:url）。
 * 跨平台：Windows / Linux / macOS 都能跑，中文路径按 UTF-8 处理。
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_DIR = path.join(REPO_ROOT, '_templates');

/**
 * <类型> → { template, type }
 *   template：_templates/ 下的模板文件名
 *   type    ：写进 front-matter 的规范 type，必须落在 SCHEMA.md §3.1 的 9 个枚举值里
 *
 * 关于两个"不在枚举里"的类型，按就近归并（SCHEMA.md §3.1 只有 9 个 type）：
 *   硬件资料 → 技术模块：一类设备/一门技术一篇，正文放 技术模块/ 下
 *   项目复盘 → 项目实践：复盘的对象本来就是一个项目
 *   （技术经验与踩坑记录是同一件事的两种叫法，都映射 type: 技术经验）
 */
const TYPES = {
  技术模块: { template: '技术模块模板.md', type: '技术模块' },
  项目实践: { template: '项目README模板.md', type: '项目实践' },
  技术经验: { template: '踩坑记录模板.md', type: '技术经验' },
  踩坑记录: { template: '踩坑记录模板.md', type: '技术经验' },
  学习课程: { template: '课程模板.md', type: '学习课程' },
  硬件资料: { template: '硬件资料模板.md', type: '技术模块' },
  项目复盘: { template: '项目复盘模板.md', type: '项目实践' },
  部门介绍: { template: '部门介绍模板.md', type: '部门介绍' },
  历史与交接: { template: '历史与交接模板.md', type: '历史与交接' },
};

/** front-matter 的字段顺序：前 7 个必填，tags 选填（SCHEMA.md §3）。 */
const FIELD_ORDER = ['title', 'type', '部门', '维护人', '更新', '状态', '可见性', 'tags'];

/** 仓库内相对路径统一用 `/` 展示，Windows 与 CI 的日志看起来一样。 */
function rel(p) {
  return path.relative(REPO_ROOT, p).split(path.sep).join('/');
}

/** 本地日期（不是 UTC），YYYY-MM-DD。 */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function printUsage(stream = process.stderr) {
  const lines = [];
  lines.push('用法：node scripts/new.mjs <类型> <目标路径>');
  lines.push('');
  lines.push('  <类型>      必填，可用值见下面清单');
  lines.push('  <目标路径>  必填，不带 .md 后缀，可带子目录；已存在的文件不会被覆盖');
  lines.push('');
  lines.push('可用类型（括号里是写进 front-matter 的规范 type）：');
  const width = Math.max(...Object.keys(TYPES).map((k) => [...k].length * 2));
  for (const [name, spec] of Object.entries(TYPES)) {
    const pad = ' '.repeat(Math.max(1, width - [...name].length * 2 + 2));
    lines.push(`  ${name}${pad}→ _templates/${spec.template}  (type: ${spec.type})`);
  }
  lines.push('');
  lines.push('示例：');
  lines.push('  node scripts/new.mjs 技术模块 docs/部门/终端服务部/技术模块/Ansible批量配置');
  lines.push('  node scripts/new.mjs 项目实践 docs/部门/终端服务部/项目实践/机房监控大屏');
  lines.push('  node scripts/new.mjs 技术经验 docs/部门/终端服务部/技术经验/磁盘inode耗尽');
  lines.push('  node scripts/new.mjs 学习课程 docs/部门/终端服务部/学习课程/第02课-容器基础');
  lines.push('');
  stream.write(lines.join('\n') + '\n');
}

function fail(message) {
  process.stderr.write(message.replace(/\n?$/, '\n'));
  process.exit(1);
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeText(text) {
  // 统一成 LF：仓库要求 LF，且模板可能是 CRLF 检出的。
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** 取出模板开头的 front-matter 块（含两侧的 `---`），没有则返回 null。 */
function frontMatterRange(text) {
  const m = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text);
  if (!m) return null;
  return { inner: m[1], end: m[0].length };
}

/** YAML 标量：只在必要时加双引号，避免生成 `title: 端口占用: 404` 这类非法行。 */
function scalar(value) {
  const s = String(value);
  if (s === '') return '""';
  if (/^[ \t]|[ \t]$/.test(s)) return JSON.stringify(s);
  if (/[:#[\]{},&*!|>'"%@`]/.test(s) || /^[-?]/.test(s) || /^(?:true|false|null|~)$/i.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

/**
 * 生成新的 front-matter。
 * 模板里已有的、不属于 8 个规范字段的键（例如 `课时:`、`难度:`）原样保留，
 * 连同它们的缩进续行一起搬过来，不会被吃掉。
 */
function buildFrontMatter(templateText, values) {
  const extras = [];
  const fm = frontMatterRange(templateText);
  if (fm) {
    let current = null;
    for (const line of fm.inner.split('\n')) {
      const m = /^([^\s#][^:]*):/.exec(line);
      if (m) {
        const key = m[1].trim();
        current = null;
        if (!FIELD_ORDER.includes(key)) {
          current = [line];
          extras.push(current);
        }
      } else if (current && /^\s+\S/.test(line)) {
        current.push(line);
      }
    }
  }
  const lines = FIELD_ORDER.map((key) => `${key}: ${values[key]}`);
  return ['---', ...lines, ...extras.flat(), '---'].join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    printUsage(process.stderr);
    process.exit(1);
  }
  if (argv.length > 2) {
    process.stderr.write('❌ 参数过多：只接受 <类型> 与 <目标路径> 两个参数（路径含空格时请用引号包起来）。\n\n');
    printUsage(process.stderr);
    process.exit(1);
  }

  const [typeArg, targetArg] = argv;
  const spec = TYPES[typeArg];
  if (!spec) {
    process.stderr.write(`❌ 未知类型：${typeArg}\n\n`);
    printUsage(process.stderr);
    process.exit(1);
  }

  let targetRel = targetArg.trim();
  if (targetRel === '') {
    process.stderr.write('❌ 目标路径为空。\n\n');
    printUsage(process.stderr);
    process.exit(1);
  }
  let strippedMd = false;
  if (/\.md$/i.test(targetRel)) {
    targetRel = targetRel.replace(/\.md$/i, '');
    strippedMd = true;
  }

  const absTarget = path.resolve(process.cwd(), targetRel);
  const targetFile = `${absTarget}.md`;
  const title = path.basename(absTarget);

  const templatePath = path.join(TEMPLATE_DIR, spec.template);
  let templateText;
  try {
    templateText = normalizeText(await readFile(templatePath, 'utf8'));
  } catch {
    fail(`❌ 找不到模板：_templates/${spec.template}\n   模板由模板维护者提供；请确认 _templates/ 下存在该文件，或换一个类型。`);
  }

  if (await exists(targetFile)) {
    fail(`❌ 目标已存在，拒绝覆盖：${rel(targetFile)}\n   换一个文件名，或先手动删除它再重跑。`);
  }

  const values = {
    title: scalar(title),
    type: scalar(spec.type),
    部门: scalar('终端服务部'),
    维护人: scalar('<你的GitHub用户名>'),
    更新: scalar(today()),
    状态: scalar('草稿'),
    可见性: scalar('公开'),
    tags: '[]',
  };

  const fm = frontMatterRange(templateText);
  const body = (fm ? templateText.slice(fm.end) : templateText).replace(/^\n+/, '');
  const content = `${buildFrontMatter(templateText, values)}\n\n${body}`.replace(/\n+$/, '') + '\n';

  await mkdir(path.dirname(targetFile), { recursive: true });
  await writeFile(targetFile, content, 'utf8');

  const out = [];
  out.push(`✅ 已创建：${rel(targetFile)}`);
  out.push(`   模板：_templates/${spec.template}`);
  out.push(`   规范 type：${spec.type}（状态：草稿，可见性：公开，更新：${today()}）`);
  if (strippedMd) out.push('   注意：目标路径带了 .md 后缀，已自动去掉。');
  if (!fm) out.push('   注意：模板没有 front-matter，已按契约新写一段。');
  out.push('');
  out.push('下一步：');
  out.push('  1. 打开这个文件，把 front-matter 里的 `维护人: <你的GitHub用户名>` 换成你的 GitHub 用户名。');
  out.push('  2. 按「四能」自查：能理解 / 能学习 / 能复现 / 能延续；小节标题全部保留，不适用就写「不适用」。');
  out.push('  3. 把这一页加进 nav.片段.yml（否则站点里点不到它），再跑一遍本地自检四条。');
  process.stdout.write(out.join('\n') + '\n');
}

main().catch((err) => {
  process.stderr.write(`❌ 脚本自身出错：${err && err.stack ? err.stack : String(err)}\n`);
  process.exit(2);
});
