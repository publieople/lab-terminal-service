// 新建一页：按类型套模板、建目录、把 `更新` 填成今天。
//
// 用法：node scripts/new.mjs                    列出所有类型与示例
//      node scripts/new.mjs 课程 docs/部门/终端服务部/学习/01-Windows基础/03-环境变量
//
// 只做三件事：建目录、复制模板、填 title 与 更新。
// 其余字段（维护人、难度、适用版本、一句话）要你自己填——这是唯一脚本替不了的事。

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/docs.mjs';

const schema = JSON.parse(fs.readFileSync(path.join(ROOT, '_schema', 'pages.json'), 'utf8'));

const TYPES = Object.entries(schema.types).map(([type, cfg]) => ({ type, ...cfg }));
const EXAMPLES = {
  课程: 'docs/部门/终端服务部/学习/01-Windows基础/03-环境变量',
  参考: 'docs/部门/终端服务部/参考/端口与防火墙',
  项目: 'docs/部门/终端服务部/项目/机房监控大屏',
  经验: 'docs/部门/终端服务部/经验/磁盘inode耗尽',
  记录: 'docs/部门/终端服务部/历史与交接/2026年春季人员变动',
  管理: 'docs/部门/终端服务部/参考/README',
};

const [type, target] = process.argv.slice(2);

if (!type) {
  console.log('用法：node scripts/new.mjs <类型> <仓库相对路径，不带 .md>\n');
  console.log('类型    模板');
  for (const t of TYPES) console.log(`${t.type}    ${t.template}`);
  console.log('\n示例：');
  for (const [k, v] of Object.entries(EXAMPLES)) console.log(`  node scripts/new.mjs ${k} ${v}`);
  process.exit(0);
}

const t = TYPES.find((x) => x.type === type);
if (!t) {
  console.error(`❌ 没有类型「${type}」。可选：${TYPES.map((x) => x.type).join(' / ')}`);
  process.exit(1);
}
if (!target) {
  console.error('❌ 还要给一个目标路径，例如：' + EXAMPLES[type]);
  process.exit(1);
}

const tplPath = path.join(ROOT, t.template);
if (!fs.existsSync(tplPath)) {
  console.error(`❌ 找不到模板 ${t.template}`);
  process.exit(1);
}

const outRel = target.replace(/\.md$/, '') + '.md';
const outAbs = path.join(ROOT, outRel);
if (fs.existsSync(outAbs)) {
  console.error(`❌ 文件已存在：${outRel}`);
  process.exit(1);
}

const title = path.basename(outRel, '.md').replace(/^\d+[-_．.\s]*/, '');
const today = new Date().toISOString().slice(0, 10);
const content = fs
  .readFileSync(tplPath, 'utf8')
  .replaceAll('<标题>', title)
  .replace(/^更新:.*$/m, `更新: ${today}`);

fs.mkdirSync(path.dirname(outAbs), { recursive: true });
fs.writeFileSync(outAbs, content);
console.log(`✓ 已创建 ${outRel}（type: ${type}）`);
console.log('\n接下来：');
console.log('  1. 填 front-matter 的 维护人 / 难度 / 适用版本 / 一句话，删掉尖括号占位符');
console.log('  2. 删掉模板里的斜体提示，按章节写正文');
console.log('  3. node scripts/gen-index.mjs && node scripts/gen-nav.mjs');
console.log('  4. npx markdownlint-cli2 && node scripts/check-pages.mjs && node scripts/check-secrets.mjs');
