// ============================================
// 学习进度追踪模块（LocalStorage 持久化）
// 状态机：new(新词) → learning(学习中) → mastered(已掌握)
// ============================================
const Progress = (() => {
  const KEY = 'cet6_progress_v1';
  let data = { words: {}, daily: {}, wrongBook: [] };
  let els = null;

  function fmtDate(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function today() { return fmtDate(new Date()); }
  function lastNDates(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(fmtDate(new Date(Date.now() - i * 86400000)));
    return out;
  }

  function init() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) { /* 损坏数据则重置 */ }
    if (!data.words || !data.daily || !data.wrongBook) data = { words: {}, daily: {}, wrongBook: [] };
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(data)); }
  function get(id) { return data.words[id] || null; }

  function touch(wordId, correct) {
    const w = data.words[wordId] || { status: 'new', streak: 0, correct: 0, wrong: 0 };
    if (correct) {
      w.correct++; w.streak++;
      w.status = w.streak >= 2 ? 'mastered' : 'learning'; // 连对两次即掌握
    } else {
      w.wrong++; w.streak = 0;
      w.status = 'learning';
    }
    w.lastSeen = Date.now();
    data.words[wordId] = w;
    return w;
  }
  function logDaily(correct) {
    const d = data.daily[today()] || (data.daily[today()] = { correct: 0, wrong: 0 });
    correct ? d.correct++ : d.wrong++;
  }
  function syncWrongBook(wordId, correct) {
    const i = data.wrongBook.indexOf(wordId);
    if (!correct && i === -1) data.wrongBook.push(wordId);
    if (correct && i > -1 && data.words[wordId] && data.words[wordId].status === 'mastered') {
      data.wrongBook.splice(i, 1); // 掌握后自动移出错题本
    }
  }

  // 测验/拼写用：基于连对次数的状态机
  function recordAnswer(wordId, correct) {
    touch(wordId, correct);
    logDaily(correct);
    syncWrongBook(wordId, correct);
    save();
  }
  // 卡片用：直接标记
  function markCard(wordId, known) {
    const w = data.words[wordId] || { status: 'new', streak: 0, correct: 0, wrong: 0 };
    if (known) { w.status = 'mastered'; w.streak = Math.max(w.streak, 2); w.correct++; }
    else { w.status = 'learning'; w.streak = 0; w.wrong++; }
    w.lastSeen = Date.now();
    data.words[wordId] = w;
    logDaily(known);
    syncWrongBook(wordId, known);
    save();
  }
  // 错题本里手动标记掌握
  function removeWrong(wordId) {
    const i = data.wrongBook.indexOf(wordId);
    if (i > -1) {
      data.wrongBook.splice(i, 1);
      const w = data.words[wordId];
      if (w) { w.status = 'mastered'; w.streak = 2; }
      save();
    }
  }

  function wrongList() { return data.wrongBook; }

  function getStats() {
    const total = WORD_DB.length;
    let mastered = 0, learning = 0, correct = 0, wrong = 0;
    for (const id in data.words) {
      const w = data.words[id];
      if (w.status === 'mastered') mastered++;
      else if (w.status === 'learning') learning++;
      correct += w.correct || 0;
      wrong += w.wrong || 0;
    }
    const done = correct + wrong;
    return {
      total, mastered, learning,
      untouched: total - mastered - learning,
      accuracy: done ? Math.round(correct / done * 100) : 0,
      wrongCount: data.wrongBook.length
    };
  }

  function reset() {
    data = { words: {}, daily: {}, wrongBook: [] };
    save();
  }

  /* ===== 进度面板渲染 ===== */
  function cacheEls() {
    els = {
      total: document.getElementById('st-total'),
      mastered: document.getElementById('st-mastered'),
      learning: document.getElementById('st-learning'),
      wrong: document.getElementById('st-wrong'),
      accuracy: document.getElementById('st-accuracy'),
      bars: document.getElementById('pg-bars'),
      donut: document.getElementById('pg-donut'),
      donutText: document.getElementById('pg-donut-text'),
      wrongListEl: document.getElementById('pg-wrong-list')
    };
  }

  function render() {
    if (!els) cacheEls();
    const s = getStats();
    els.total.textContent = s.total;
    els.mastered.textContent = s.mastered;
    els.learning.textContent = s.learning;
    els.wrong.textContent = s.wrongCount;
    els.accuracy.textContent = s.accuracy + '%';

    // 近 7 天柱状图
    const days = lastNDates(7).map(d => ({
      date: d,
      correct: (data.daily[d] || {}).correct || 0,
      wrong: (data.daily[d] || {}).wrong || 0
    }));
    const max = Math.max(1, ...days.map(d => d.correct + d.wrong));
    els.bars.innerHTML = days.map(d => `
      <div class="bar-col" title="${d.date}：答对 ${d.correct}，答错 ${d.wrong}">
        <div class="bar-stack">
          <div class="bar wrong" style="height:${(d.wrong / max) * 100}%"></div>
          <div class="bar correct" style="height:${(d.correct / max) * 100}%"></div>
        </div>
        <span class="bar-label">${d.date.slice(5)}</span>
      </div>`).join('');

    // 掌握度环形图
    const p1 = (s.mastered / s.total) * 100;
    const p2 = (s.learning / s.total) * 100;
    els.donut.style.background =
      `conic-gradient(#22c55e 0 ${p1}%, #f59e0b ${p1}% ${p1 + p2}%, #e5e9f0 ${p1 + p2}% 100%)`;
    els.donutText.textContent = Math.round(p1) + '%';

    // 错题本
    if (!data.wrongBook.length) {
      els.wrongListEl.innerHTML = '<li class="empty">太棒了，错题本是空的！继续保持 🎉</li>';
      return;
    }
    els.wrongListEl.innerHTML = data.wrongBook.map(id => {
      const w = WORD_DB.find(x => x.id === id);
      if (!w) return '';
      return `<li class="wrong-item">
        <div>
          <b>${w.word}</b> <span class="phonetic">${w.phonetic}</span>
          <div class="meaning">${w.pos} ${w.meaning}</div>
        </div>
        <button class="btn success small" data-master="${w.id}">已掌握 ✓</button>
      </li>`;
    }).join('');
    els.wrongListEl.querySelectorAll('[data-master]').forEach(btn =>
      btn.addEventListener('click', () => { removeWrong(Number(btn.dataset.master)); render(); })
    );
  }

  return { init, get, recordAnswer, markCard, removeWrong, wrongList, getStats, reset, render };
})();
