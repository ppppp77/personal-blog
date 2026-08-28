// ============================================
// 词库构建脚本：有道考神 CET-4/CET-6 JSON Lines → js/data.js
// 用法：node tools/build-dict.js <原始数据目录>
// 原始数据来源：https://github.com/kajweb/dict （book/*.zip 解压）
// ============================================
const fs = require('fs');
const path = require('path');

const SRC = process.argv[2] || '/tmp/dict-src/youdao';
const OUT = path.join(__dirname, '..', 'js', 'data.js');

// 四级书先扫（level 1），六级书后扫（仅补充新词，level 2）
const BOOKS = [
  { file: '1521164649209_CET4_1/CET4_1.json', level: 1 },
  { file: '1521164635506_CET4_2/CET4_2.json', level: 1 },
  { file: '1521164643060_CET4_3/CET4_3.json', level: 1 },
  { file: '1521164668667_CET6_1/CET6_1.json', level: 2 },
  { file: '1524052554766_CET6_2/CET6_2.json', level: 2 },
  { file: '1521164633851_CET6_3/CET6_3.json', level: 2 },
];

function clean(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function buildPhonetic(c) {
  const first = (s) => clean(s).split(';')[0].trim();
  const uk = first(c.ukphone);
  const us = first(c.usphone);
  const p = uk || us;
  return p ? '/' + p + '/' : '';
}

function buildPosMeaning(trans) {
  if (!trans || !trans.length) return { pos: '', meaning: '' };
  const poses = [];
  const parts = [];
  for (const t of trans) {
    const pos = clean(t.pos);
    const tran = clean(t.tranCn);
    if (!tran) continue;
    if (pos && !poses.includes(pos)) poses.push(pos);
    parts.push(tran);
  }
  return { pos: poses.map(p => p + '.').join('/'), meaning: parts.join('；') };
}

function buildExam(exams) {
  if (!exams || !exams.length) return null;
  const e = exams[0];
  const choices = (e.choices || []).slice().sort((a, b) => a.choiceIndex - b.choiceIndex)
    .map(c => clean(c.choice)).filter(Boolean);
  const right = e.answer && e.answer.rightIndex;
  if (choices.length !== 4 || !(right >= 1 && right <= 4) || !e.question) return null;
  return {
    q: clean(e.question).replace(/_{2,}/g, '____'),
    choices,
    right: right - 1,
    exp: clean(e.answer && e.answer.explain)
  };
}

const map = new Map();
for (const book of BOOKS) {
  const raw = fs.readFileSync(path.join(SRC, book.file), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch (e) { continue; }
    const word = clean(o.headWord);
    const c = o.content && o.content.word && o.content.word.content;
    if (!word || !c || /\s/.test(word)) continue;

    const key = word.toLowerCase();
    const sents = (c.sentence && c.sentence.sentences) || [];
    const example = clean(sents[0] && sents[0].sContent);
    const exampleCn = clean(sents[0] && sents[0].sCn);
    const exam = buildExam(c.exam);

    const prev = map.get(key);
    if (!prev) {
      map.set(key, { word, level: book.level, c, example, exampleCn, exam });
    } else {
      // 同词重复：补例句 / 补真题；四级出现过的词保持 level 1
      if (book.level === 1) prev.level = 1;
      if (!prev.example && example) { prev.example = example; prev.exampleCn = exampleCn; }
      if (!prev.exam && exam) prev.exam = exam;
    }
  }
}

const entries = [];
let id = 1;
for (const { word, level, c, example, exampleCn, exam } of map.values()) {
  const { pos, meaning } = buildPosMeaning(c.trans);
  if (!meaning) continue;
  const entry = { id: id++, word, phonetic: buildPhonetic(c), pos, meaning, level };
  if (example) { entry.example = example; if (exampleCn) entry.exampleCn = exampleCn; }
  if (exam) entry.exam = exam;
  entries.push(entry);
}

const lines = entries.map(e => '  ' + JSON.stringify(e));
const out = `// ============================================
// CET-4/CET-6 词汇数据库（${entries.length} 词）
// 数据来源：有道考神四级/六级真题核心词（kajweb/dict）
// level: 1 = 四级基础词  2 = 六级进阶词
// exam: 六级真题选择题（q 题干 / choices 选项 / right 正确下标 / exp 解析）
// 重新生成：node tools/build-dict.js <原始数据目录>
// ============================================
const WORD_DB = [
${lines.join(',\n')}
];

// ============================================
// 通用工具函数
// ============================================
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeRe(s) {
  return s.replace(/[.*+?^\${}()|[\]\\\\]/g, '\\\\$&');
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch (e) {
    console.warn('语音合成不可用：', e);
  }
}
`;

fs.writeFileSync(OUT, out, 'utf8');
const size = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
const withEx = entries.filter(e => e.example).length;
const withExam = entries.filter(e => e.exam).length;
console.log(`已生成 ${OUT}`);
console.log(`词条: ${entries.length} | 四级基础: ${entries.filter(e => e.level === 1).length} | 六级进阶: ${entries.filter(e => e.level === 2).length}`);
console.log(`含例句: ${withEx} | 含真题选择题: ${withExam} | 文件大小: ${size} MB`);
