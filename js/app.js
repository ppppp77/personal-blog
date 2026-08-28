// ============================================
// 应用入口：模块初始化 + 视图路由 + 全局键盘
// ============================================
(function () {
  Progress.init();
  Flashcard.init();
  Quiz.init();
  Spelling.init();

  // 导航切换
  const navBtns = document.querySelectorAll('nav button[data-view]');

  // 卡片筛选器的词数标签随词库动态更新
  const allOpt = document.querySelector('#fc-filter option[value="all"]');
  if (allOpt) allOpt.textContent = '全部词汇（' + WORD_DB.length + ' 词）';
  function switchView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.view === name));
    if (name === 'progress') Progress.render();
    window.scrollTo(0, 0);
  }
  navBtns.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));

  // 全局键盘：测验数字键、卡片翻面键
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (/^[1-4]$/.test(e.key)) Quiz.pressKey(e.key);
    Flashcard.onKey(e);
  });

  // 清空学习数据
  document.getElementById('pg-reset').addEventListener('click', () => {
    if (confirm('确定要清空全部学习数据吗？此操作不可恢复。')) {
      Progress.reset();
      Flashcard.rebuild(); // 重建牌组，刷新卡片上的状态标签
      Progress.render();
    }
  });

  // 首次打开默认展示进度概况
  Progress.render();
})();
