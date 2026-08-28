// ============================================
// 选择题测验模块
// 题型：英译中 / 中译英 / 例句填空
// 出题加权：错题本 4 倍，学习中 2 倍，其余 1 倍
// ============================================
const Quiz = (() => {
  const TOTAL = 10;
  let qs = [], cur = 0, score = 0, locked = false, wrongQs = [];
  let els = null;

  function weightedPick() {
    const wrong = Progress.wrongList();
    const pool = WORD_DB.map(w => {
      let k = 1;
      if (wrong.includes(w.id)) k = 4;
      else {
        const r = Progress.get(w.id);
        if (r && r.status === 'learning') k = 2;
      }
      return { w, k };
    });
    const picked = [];
    while (picked.length < TOTAL && pool.length) {
      const totalK = pool.reduce((s, p) => s + p.k, 0);
      let r = Math.random() * totalK, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].k; if (r <= 0) break; }
      if (i >= pool.length) i = pool.length - 1;
      picked.push(pool.splice(i, 1)[0].w);
    }
    return picked;
  }

  function makeQ(word) {
    const others = shuffle(WORD_DB.filter(w => w.id !== word.id)).slice(0, 3);

    // 有真题的词优先出真题选择题（保留部分普通题型换换花样）
    if (word.exam && Math.random() < 0.8) {
      const e = word.exam;
      return {
        typeName: '真题选择 · 选出正确答案',
        prompt: e.q,
        options: e.choices.map((t, i) => ({ key: 'c' + i, text: esc(t) })),
        answer: 'c' + e.right,
        word, explain: e.exp
      };
    }

    const en2zh = () => ({
      typeName: '英译中 · 选出正确释义',
      prompt: word.word + '   ' + word.phonetic,
      options: shuffle([word, ...others]).map(x => ({ key: String(x.id), text: x.pos + ' ' + x.meaning })),
      answer: String(word.id), word
    });
    const type = ['en2zh', 'zh2en', 'fill'][Math.floor(Math.random() * 3)];
    if (type === 'zh2en') {
      return {
        typeName: '中译英 · 选出正确单词',
        prompt: word.pos + ' ' + word.meaning,
        options: shuffle([word, ...others]).map(x =>
          ({ key: String(x.id), text: x.word + ' <span class="phonetic">' + x.phonetic + '</span>' })),
        answer: String(word.id), word
      };
    }
    if (type === 'fill') {
      const re = new RegExp('\\b' + escapeRe(word.word) + '\\b', 'i');
      if (word.example && re.test(word.example)) {
        return {
          typeName: '例句填空 · 选出合适的单词',
          prompt: word.example.replace(re, '____'),
          options: shuffle([word, ...others]).map(x =>
            ({ key: String(x.id), text: x.word + ' <span class="phonetic">' + x.phonetic + '</span>' })),
          answer: String(word.id), word
        };
      }
    }
    return en2zh();
  }

  function start() {
    qs = weightedPick().map(makeQ);
    cur = 0; score = 0; wrongQs = [];
    els.intro.hidden = true;
    els.result.hidden = true;
    els.play.hidden = false;
    showQ();
  }

  function showQ() {
    locked = false;
    const q = qs[cur];
    els.count.textContent = '第 ' + (cur + 1) + ' / ' + TOTAL + ' 题';
    els.score.textContent = '得分 ' + score;
    els.type.textContent = q.typeName;
    els.question.textContent = q.prompt;
    els.options.innerHTML = q.options.map((o, i) =>
      '<button class="opt" data-key="' + o.key + '"><span class="opt-key">' + (i + 1) + '</span>' + o.text + '</button>'
    ).join('');
    els.options.querySelectorAll('.opt').forEach(btn =>
      btn.addEventListener('click', () => choose(btn.dataset.key, btn))
    );
    els.feedback.hidden = true;
    els.next.hidden = true;
  }

  function choose(key, btn) {
    if (locked) return;
    locked = true;
    const q = qs[cur];
    const ok = String(key) === String(q.answer);
    if (ok) {
      score++;
      btn.classList.add('correct');
    } else {
      btn.classList.add('wrong');
      wrongQs.push(q);
      const right = els.options.querySelector('[data-key="' + q.answer + '"]');
      if (right) right.classList.add('correct');
    }
    els.options.querySelectorAll('.opt').forEach(b => b.disabled = true);
    Progress.recordAnswer(q.word.id, ok);
    els.score.textContent = '得分 ' + score;
    els.feedback.hidden = false;
    els.feedback.className = 'quiz-feedback ' + (ok ? 'good' : 'bad');
    let html = (ok ? '✅ 答对了！' : '❌ 答错了。') +
      ' <b>' + q.word.word + '</b> ' + q.word.phonetic + ' ' + q.word.pos + ' ' + q.word.meaning;
    if (q.word.example) html += '<br><i>' + esc(q.word.example) + '</i>';
    if (q.explain) html += '<br><b>真题解析：</b>' + esc(q.explain);
    els.feedback.innerHTML = html;
    els.next.hidden = false;
    els.next.textContent = cur === TOTAL - 1 ? '查看成绩' : '下一题';
    els.next.focus();
  }

  function next() {
    if (cur < TOTAL - 1) { cur++; showQ(); }
    else finish();
  }

  function finish() {
    els.play.hidden = true;
    els.result.hidden = false;
    const s = Math.round(score / TOTAL * 100);
    els.final.textContent = s + ' 分';
    els.comment.textContent =
      s >= 90 ? '太厉害了，六级词汇掌握得非常扎实！🏆' :
      s >= 70 ? '表现不错，继续保持这个节奏！💪' :
      s >= 50 ? '刚好及格，多刷错题本会有明显提升。📖' :
      '别灰心，回到单词卡片再过一轮吧。🔁';
    els.wrongListEl.innerHTML = wrongQs.length
      ? wrongQs.map(q =>
          '<li><b>' + q.word.word + '</b> ' + q.word.phonetic + ' — ' + q.word.pos + ' ' + q.word.meaning +
          (q.word.example ? '<br><i>' + esc(q.word.example) + '</i>' : '') + '</li>'
        ).join('')
      : '<li class="empty">全对，没有错题！🎉</li>';
  }

  // 键盘 1-4 选择答案
  function pressKey(k) {
    if (els.play.hidden || !document.getElementById('view-quiz').classList.contains('active')) return;
    const b = els.options.querySelectorAll('.opt')[Number(k) - 1];
    if (b && !locked) b.click();
  }

  function init() {
    els = {
      intro: document.getElementById('quiz-intro'),
      play: document.getElementById('quiz-play'),
      result: document.getElementById('quiz-result'),
      count: document.getElementById('quiz-count'),
      score: document.getElementById('quiz-score'),
      type: document.getElementById('quiz-type'),
      question: document.getElementById('quiz-question'),
      options: document.getElementById('quiz-options'),
      feedback: document.getElementById('quiz-feedback'),
      next: document.getElementById('quiz-next'),
      final: document.getElementById('quiz-final'),
      comment: document.getElementById('quiz-comment'),
      wrongListEl: document.getElementById('quiz-wrong-list')
    };
    document.getElementById('quiz-begin').addEventListener('click', start);
    document.getElementById('quiz-restart').addEventListener('click', start);
    els.next.addEventListener('click', next);
  }

  return { init, pressKey };
})();
