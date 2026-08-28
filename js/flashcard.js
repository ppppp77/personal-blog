// ============================================
// 单词卡片模块
// ============================================
const Flashcard = (() => {
  let deck = [], idx = 0, shuffleNext = false;
  let els = null;

  function statusOf(id) {
    const r = Progress.get(id);
    return r ? r.status : 'new';
  }

  /* ===== 每日深海信标：按日期确定性抽取，全日同词 ===== */
  function dailyBeacon() {
    const d = new Date();
    const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const w = WORD_DB[seed % WORD_DB.length];
    els.beaconWord.textContent = w.word;
    els.beaconWord.dataset.id = w.id;
    els.beaconMeaning.innerHTML = '<span class="pos">' + w.pos + '</span>' + w.meaning +
      ' <span class="phonetic">' + w.phonetic + '</span>';
  }

  function gotoBeacon() {
    const id = Number(els.beaconWord.dataset.id);
    const i = deck.findIndex(w => w.id === id);
    if (i > -1) { idx = i; render(); }
    speak(els.beaconWord.textContent);
  }

  // 声呐按钮波纹
  function sonarPing() {
    els.speak.classList.remove('pinging');
    void els.speak.offsetWidth; // 重启动画
    els.speak.classList.add('pinging');
    setTimeout(() => els.speak.classList.remove('pinging'), 700);
  }

  function buildDeck() {
    const f = els.filter.value;
    let pool = WORD_DB.filter(w => f === 'all' || (f === 'cet4' ? w.level === 1 : w.level === 2));
    if (els.mode.value === 'smart' && !shuffleNext) {
      // 智能排序：学习中的排最前，新词其次，已掌握的最后
      const rank = { learning: 0, new: 1, mastered: 2 };
      pool = pool.slice().sort((a, b) => rank[statusOf(a.id)] - rank[statusOf(b.id)] || a.id - b.id);
    } else {
      pool = shuffle(pool);
    }
    shuffleNext = false;
    deck = pool;
    idx = 0;
    render();
  }

  function render() {
    const w = deck[idx];
    if (!w) return;
    els.card.classList.remove('flipped');
    els.word.textContent = w.word;
    els.phonetic.textContent = w.phonetic;
    els.meaning.innerHTML = '<span class="pos">' + w.pos + '</span>' + w.meaning;
    els.example.innerHTML = w.example
      ? esc(w.example) + (w.exampleCn ? '<br><span class="ex-cn">' + esc(w.exampleCn) + '</span>' : '')
      : '<span class="ex-cn">（暂无例句）</span>';
    const st = statusOf(w.id);
    els.chip.textContent = st === 'mastered' ? '✓ 已掌握' : st === 'learning' ? '↻ 学习中' : '＋ 新词';
    els.chip.className = 'fc-status-chip ' + st;
    // 首次见到的词 → 新发现标记
    els.discovery.hidden = !Progress.get(w.id) ? false : true;
    els.meta.textContent = '第 ' + (idx + 1) + ' / ' + deck.length + ' 张';
    // ASCII 像素进度读数
    const cells = 16;
    const filled = Math.round((idx + 1) / deck.length * cells);
    els.barText.textContent = '▮'.repeat(filled) + '░'.repeat(cells - filled) + ' ' +
      Math.round((idx + 1) / deck.length * 100) + '%';
    els.bar.style.width = ((idx + 1) / deck.length * 100) + '%';
  }

  function flip() { els.card.classList.toggle('flipped'); }
  function move(dir) {
    if (!deck.length) return;
    idx = (idx + dir + deck.length) % deck.length;
    render();
  }
  function answer(known) {
    Progress.markCard(deck[idx].id, known);
    move(1);
  }

  // 键盘：空格翻面，左右方向键切换
  function onKey(e) {
    if (!document.getElementById('view-flashcard').classList.contains('active')) return;
    if (e.code === 'Space') { e.preventDefault(); flip(); }
    else if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowLeft') move(-1);
  }

  function init() {
    els = {
      filter: document.getElementById('fc-filter'),
      mode: document.getElementById('fc-mode'),
      card: document.getElementById('fc-card'),
      word: document.getElementById('fc-word'),
      phonetic: document.getElementById('fc-phonetic'),
      meaning: document.getElementById('fc-meaning'),
      example: document.getElementById('fc-example'),
      chip: document.getElementById('fc-chip'),
      meta: document.getElementById('fc-meta'),
      bar: document.getElementById('fc-progress-bar'),
      barText: document.getElementById('fc-bar-text'),
      discovery: document.getElementById('fc-discovery'),
      speak: document.getElementById('fc-speak'),
      beaconWord: document.getElementById('beacon-word'),
      beaconMeaning: document.getElementById('beacon-meaning')
    };
    dailyBeacon();
    document.getElementById('beacon-goto').addEventListener('click', gotoBeacon);
    els.card.addEventListener('click', flip);
    els.speak.addEventListener('click', e => {
      e.stopPropagation();
      sonarPing();
      speak(deck[idx].word);
    });
    document.getElementById('fc-prev').addEventListener('click', () => move(-1));
    document.getElementById('fc-next').addEventListener('click', () => move(1));
    document.getElementById('fc-know').addEventListener('click', () => answer(true));
    document.getElementById('fc-again').addEventListener('click', () => answer(false));
    document.getElementById('fc-shuffle').addEventListener('click', () => { shuffleNext = true; buildDeck(); });
    els.filter.addEventListener('change', buildDeck);
    els.mode.addEventListener('change', buildDeck);
    buildDeck();
  }

  return { init, onKey, rebuild: buildDeck };
})();
