// ============================================
// 拼写练习模块
// 显示释义 + 朗读发音，用户输入单词拼写
// 优先从错题本出题
// ============================================
const Spelling = (() => {
  let current = null, round = 0, results = [];
  let els = null;

  function pickWord() {
    const wrong = Progress.wrongList();
    // 40% 概率优先考错题本中的词
    if (wrong.length && Math.random() < 0.4) {
      const id = wrong[Math.floor(Math.random() * wrong.length)];
      const w = WORD_DB.find(x => x.id === id);
      if (w) return w;
    }
    return WORD_DB[Math.floor(Math.random() * WORD_DB.length)];
  }

  function nextWord() {
    current = pickWord();
    els.input.value = '';
    els.input.disabled = false;
    els.check.hidden = false;
    els.nextBtn.hidden = true;
    els.hint.textContent = '';
    els.letters.innerHTML = current.word.split('').map(() =>
      '<span class="letter-box">_</span>'
    ).join('');
    els.meaning.innerHTML = '<span class="pos">' + current.pos + '</span>' + current.meaning +
      ' <span class="phonetic">' + current.phonetic + '</span>';
    els.exampleWrap.hidden = true;
    els.result.hidden = true;
    els.count.textContent = '已练习 ' + round + ' 题';
    // 自动朗读一遍
    setTimeout(() => speak(current.word), 300);
    els.input.focus();
  }

  function check() {
    if (!current || els.input.disabled) return;
    const val = els.input.value.trim().toLowerCase();
    if (!val) return;
    const ok = val === current.word.toLowerCase();
    round++;
    results.push(ok);
    Progress.recordAnswer(current.id, ok);

    // 字母级反馈：逐格显示正确/错误
    const boxes = els.letters.querySelectorAll('.letter-box');
    current.word.split('').forEach((ch, i) => {
      boxes[i].textContent = ch;
      boxes[i].classList.remove('wrong-letter');
      if (!ok && (val[i] !== ch)) boxes[i].classList.add('wrong-letter');
    });

    els.input.disabled = true;
    els.check.hidden = true;
    els.nextBtn.hidden = false;
    els.result.hidden = false;
    els.result.className = 'spell-result ' + (ok ? 'good' : 'bad');
    els.result.textContent = ok ? '✅ 拼写正确！' : '❌ 正确拼写是 ' + current.word;
    els.exampleWrap.hidden = !current.example;
    els.example.innerHTML = current.example ? '<i>' + esc(current.example) + '</i>' : '';
    if (!ok) speak(current.word);
    els.nextBtn.focus();
  }

  function hint() {
    if (!current) return;
    const w = current.word;
    els.hint.textContent = '提示：共 ' + w.length + ' 个字母，首字母是 "' + w[0] +
      (w.length > 1 ? '"，尾字母是 "' + w[w.length - 1] : '') + '"';
  }

  function finishStats() {
    if (!round) return '';
    const ok = results.filter(Boolean).length;
    return '本轮正确率 ' + Math.round(ok / round * 100) + '%（' + ok + '/' + round + '）';
  }

  function init() {
    els = {
      meaning: document.getElementById('sp-meaning'),
      letters: document.getElementById('sp-letters'),
      input: document.getElementById('sp-input'),
      hint: document.getElementById('sp-hint'),
      result: document.getElementById('sp-result'),
      exampleWrap: document.getElementById('sp-example-wrap'),
      example: document.getElementById('sp-example'),
      count: document.getElementById('sp-count'),
      check: document.getElementById('sp-check'),
      nextBtn: document.getElementById('sp-next')
    };
    document.getElementById('sp-speak').addEventListener('click', () => current && speak(current.word));
    document.getElementById('sp-hint-btn').addEventListener('click', hint);
    els.check.addEventListener('click', check);
    els.nextBtn.addEventListener('click', nextWord);
    els.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); els.input.disabled ? nextWord() : check(); }
    });
    nextWord();
  }

  return { init, finishStats };
})();
