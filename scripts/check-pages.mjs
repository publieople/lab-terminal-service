// 知识库 v2 校验器：字段、枚举、必填章节，并输出三份待办清单。
//
// 规则数据在 _schema/pages.json：枚举由 fields 里的 enum 声明驱动，类型必填字段由
// requiredFor 驱动——加类型、加字段只改契约，本脚本不用动。
//
// 试运行期间（schema.migrating = true）：
//   - 缺「难度 / 适用版本」只进清单，不算错；
//   - 只有 schema.sectionsEnforced 里列出的 type 强制校验必填章节。
// 迁移完成、审核通过后把 migrating 改成 false，它就从"提醒"变成"硬门"。
//
// 用法：node scripts/check-pages.mjs

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadPages } from './lib/docs.mjs';

const schema = JSON.parse(fs.readFileSync(path.join(ROOT, '_schema', 'pages.json'), 'utf8'));
const migrating = schema.migrating === true;
const pages = loadPages(['docs']).filter((p) => !p.rel.includes('/归档/'));

const errors = [];
const missingField = [];
const backlog = [];
const needRewrite = [];
const stale = [];
const staleMs = 366 * 24 * 3600 * 1000;
const now = Date.now();
const hasHeading = (body, title) =>
  new RegExp('^#{2,4}\\s*' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'm').test(body || '');

for (const p of pages) {
  if (!p.data) {
    errors.push(`${p.rel}: 缺 front-matter`);
    continue;
  }
  const d = p.data;
  for (const f of schema.alwaysRequiredFields) {
    if (!d[f]) errors.push(`${p.rel}: 缺必填字段「${f}」`);
  }
  // 枚举与必填都由 _schema/pages.json 驱动：加类型、加字段只改契约，不改这里。
  for (const [field, cfg] of Object.entries(schema.fields)) {
    const allowed = Array.isArray(cfg.enum) ? cfg.enum : schema.enums[cfg.enum];
    const v = d[field];
    if (v && allowed && !allowed.includes(v)) {
      errors.push(`${p.rel}: ${field} 取值「${v}」不在枚举 ${allowed.join(' / ')} 里`);
    }
  }
  if (d['更新'] && !/^\d{4}-\d{2}-\d{2}$/.test(d['更新'])) {
    errors.push(`${p.rel}: 更新「${d['更新']}」不是 YYYY-MM-DD`);
  }
  if (d['更新'] && Date.parse(d['更新']) && now - Date.parse(d['更新']) > staleMs) {
    stale.push(`${p.rel}: 更新 ${d['更新']}`);
  }

  for (const [f, cfg] of Object.entries(schema.fields)) {
    if (!(cfg.requiredFor || []).includes(d.type)) continue;
    if (!d[f]) {
      // 迁移期：v2 新字段缺了只进清单；非 v2 字段（如「推荐级别」）当场报错。
      if (schema.v2Fields.includes(f)) missingField.push(`${p.rel}: 缺「${f}」`);
      else errors.push(`${p.rel}: 缺「${f}」`);
      continue;
    }
    if (d[f] === '待补') backlog.push(`${p.rel}: ${f} 待补`);
  }

  if (schema.sectionsEnforced.includes(d.type)) {
    // 试运行期间只对"已经补上 v2 字段"的页面硬校验章节：
    // 老页面还没改写，缺章节是迁移进度问题，进待重写清单，不挡 CI。
    const migrated = schema.v2Fields.every((f) => d[f]);
    const hard = !migrating || migrated;
    for (const s of schema.sections[d.type] || []) {
      if (hasHeading(p.body, s)) continue;
      const msg = `${p.rel}: 缺必填章节「${s}」`;
      if (hard) errors.push(msg);
      else needRewrite.push(msg);
    }
  }
}

const list = (title, rows, note) => {
  if (!rows.length) return;
  console.log(`\n${title}（${rows.length}）${note ? ' —— ' + note : ''}`);
  for (const r of rows.slice(0, 25)) console.log(`  - ${r}`);
  if (rows.length > 25) console.log(`  …（其余 ${rows.length - 25} 条略）`);
};

console.log(`检查了 ${pages.length} 个页面（schema v${schema.version}${migrating ? '，迁移模式' : ''}）`);
list('❌ 错误', errors);
list('📋 待补字段', missingField, '值不确定就先写「待补」');
list('📋 字段写着待补', backlog);
list('📋 待重写', needRewrite, 'v1 老页面，按新章节结构重写');
list('📋 待复核', stale, '更新超过 12 个月，维护人回看一遍再改日期');

if (errors.length) {
  console.log(`\n❌ 有 ${errors.length} 处错误`);
  process.exit(1);
}
console.log('\n✅ 没有错误');
