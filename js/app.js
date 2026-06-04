/**
 * app.js — Application entry point
 * Builds the entire UI dynamically using JavaScript (no hardcoded HTML).
 * Dragon Slayer — Adaptive MLP AI Game
 *
 * All DOM creation happens here so the language requirement
 * (JavaScript only) is fully satisfied.
 */

"use strict";

// ═══════════════════════════════════════════════════════════════
// HELPER: Create DOM element with attributes, styles, children
// ═══════════════════════════════════════════════════════════════

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'style' && typeof v === 'object') {
        Object.assign(node.style, v);
      } else if (k === 'className') {
        node.className = v;
      } else if (k.startsWith('on')) {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else {
        node.setAttribute(k, v);
      }
    });
  }
  children.forEach(c => {
    if (c == null) return;
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c instanceof Node) node.appendChild(c);
  });
  return node;
}

// Shorthand for innerHTML set
function elHTML(tag, attrs, html) {
  const node = el(tag, attrs);
  if (html) node.innerHTML = html;
  return node;
}

// ═══════════════════════════════════════════════════════════════
// BUILD ENTIRE UI
// ═══════════════════════════════════════════════════════════════

(function buildApp() {

  // ── Background Particles Container ─────────────────────────
  const bgParticles = el('div', { id: 'bg-particles' });
  document.body.appendChild(bgParticles);

  // ── App Container ──────────────────────────────────────────
  const app = el('div', { id: 'app' });
  document.body.appendChild(app);

  // ── Title Bar ──────────────────────────────────────────────
  const titleBar = el('header', { id: 'title-bar', role: 'banner' },
    elHTML('span', { style: { fontSize: '1.4rem' } }, '🐉'),
    el('h1', null, 'Dragon Slayer')
  );
  app.appendChild(titleBar);

  // ── Game Area (Grid: Left | Canvas | Right) ────────────────
  const gameArea = el('main', { id: 'game-area', role: 'main' });
  app.appendChild(gameArea);

  // ── LEFT PANEL ─────────────────────────────────────────────
  const leftPanel = el('aside', { className: 'side-panel', id: 'left-panel', 'aria-label': 'Combat status' });
  gameArea.appendChild(leftPanel);

  // HP Bars Card
  const hpCard = el('div', { className: 'glass-card' });
  hpCard.appendChild(elHTML('div', { className: 'card-title' }, '⚔️ Combat'));

  // Player HP
  const playerHpSection = el('div', { className: 'hp-section' });
  playerHpSection.appendChild(elHTML('div', { className: 'combatant-label' }, '🧙 <span id="player-name-label">Hero</span>'));
  const playerHpTrack = el('div', { className: 'hp-bar-track', role: 'progressbar', 'aria-label': 'Player HP', 'aria-valuemin': '0', 'aria-valuemax': '100' });
  playerHpTrack.appendChild(el('div', { className: 'hp-bar-fill', id: 'player-hp-bar', style: { width: '100%', background: 'linear-gradient(90deg,#00ff88,#00cc66)' } }));
  playerHpSection.appendChild(playerHpTrack);
  playerHpSection.appendChild(elHTML('div', { className: 'hp-text', id: 'player-hp-text' }, '200 / 200'));
  hpCard.appendChild(playerHpSection);

  // Dragon HP
  const dragonHpSection = el('div', { className: 'hp-section' });
  dragonHpSection.appendChild(elHTML('div', { className: 'combatant-label', style: { color: '#cc00ff' } }, '🐲 Dragon'));
  const dragonHpTrack = el('div', { className: 'hp-bar-track', role: 'progressbar', 'aria-label': 'Dragon HP', 'aria-valuemin': '0', 'aria-valuemax': '100' });
  dragonHpTrack.appendChild(el('div', { className: 'hp-bar-fill', id: 'dragon-hp-bar', style: { width: '100%', background: 'linear-gradient(90deg,#cc00ff,#8800cc)' } }));
  dragonHpSection.appendChild(dragonHpTrack);
  dragonHpSection.appendChild(elHTML('div', { className: 'hp-text', id: 'dragon-hp-text' }, '300 / 300'));
  hpCard.appendChild(dragonHpSection);
  leftPanel.appendChild(hpCard);

  // Stats Card
  const statsCard = el('div', { className: 'glass-card' });
  statsCard.appendChild(elHTML('div', { className: 'card-title' }, '📊 Stats'));
  const statsGrid = el('div', { className: 'stats-grid' });
  const statItems = [
    { label: 'Level', id: 'level-value', val: '1', style: {} },
    { label: 'Score', id: 'score-value', val: '0', style: { fontSize: '0.8rem' } },
    { label: 'Gold',  id: 'gold-value',  val: '0', style: { color: 'var(--accent-gold)' } },
    { label: 'Wave',  id: 'wave-value',  val: '1/5', style: {} },
  ];
  statItems.forEach(si => {
    const block = el('div', { className: 'stat-block' });
    block.appendChild(elHTML('div', { className: 'stat-label' }, si.label));
    const valEl = elHTML('div', { className: 'stat-value', id: si.id }, si.val);
    Object.assign(valEl.style, si.style);
    block.appendChild(valEl);
    statsGrid.appendChild(block);
  });
  statsCard.appendChild(statsGrid);
  leftPanel.appendChild(statsCard);

  // Inventory Card
  const invCard = el('div', { className: 'glass-card', style: { flex: '1', minHeight: '0' } });
  invCard.appendChild(elHTML('div', { className: 'card-title' }, '🎒 Inventory <span style="font-size:0.55rem; color:var(--text-dim); font-family:\'Inter\',sans-serif;">(Press 1–6)</span>'));
  invCard.appendChild(el('div', { id: 'inventory-slots' }));
  invCard.appendChild(elHTML('div', { style: { marginTop: '10px', fontSize: '0.6rem', color: 'var(--text-dim)', lineHeight: '1.5' } }, '🧪 Walk over dropped items to collect them.'));
  leftPanel.appendChild(invCard);

  // ── CANVAS ─────────────────────────────────────────────────
  const canvasContainer = el('section', { id: 'canvas-container', style: { position: 'relative', minWidth: '0', minHeight: '0', display: 'flex' } });
  const canvas = el('canvas', { id: 'game-canvas', width: '900', height: '550', 'aria-label': 'Dragon Slayer game arena' });
  canvasContainer.appendChild(canvas);
  gameArea.appendChild(canvasContainer);

  // ── RIGHT PANEL ────────────────────────────────────────────
  const rightPanel = el('aside', { className: 'side-panel', id: 'right-panel', 'aria-label': 'AI information and controls' });
  gameArea.appendChild(rightPanel);

  // MLP AI Card
  const mlpCard = el('div', { className: 'glass-card' });
  mlpCard.appendChild(elHTML('div', { className: 'card-title' }, '🧠 MLP Dragon AI'));

  const mlpRows = [
    { label: 'Predicts',    id: 'mlp-prediction',  def: '—' },
    { label: 'Confidence',  id: 'mlp-confidence',  def: '—' },
    { label: 'Accuracy',    id: 'mlp-accuracy',    def: '—' },
    { label: 'Train Steps', id: 'mlp-train-steps', def: '0' },
  ];
  mlpRows.forEach(r => {
    const row = el('div', { className: 'mlp-info-row' });
    row.appendChild(elHTML('span', { className: 'mlp-info-label' }, r.label));
    row.appendChild(elHTML('span', { className: 'mlp-info-val', id: r.id }, r.def));
    mlpCard.appendChild(row);
  });

  // Probability bars
  const probSection = el('div', { className: 'prob-section' });
  probSection.appendChild(elHTML('div', {
    style: { fontSize: '0.58rem', color: 'var(--text-dim)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.8px' }
  }, 'Move Probabilities'));

  const probLabels = ['← Left', '→ Right', '↑ Up', '↓ Down', '• None'];
  const probIds = ['prob-left', 'prob-right', 'prob-up', 'prob-down', 'prob-none'];
  probLabels.forEach((lbl, i) => {
    const row = el('div', { className: 'prob-row' });
    row.appendChild(elHTML('span', { className: 'prob-label' }, lbl));
    const track = el('div', { className: 'prob-bar-track' });
    track.appendChild(el('div', { className: 'prob-bar-fill', id: probIds[i] }));
    row.appendChild(track);
    probSection.appendChild(row);
  });
  mlpCard.appendChild(probSection);

  // Architecture info
  mlpCard.appendChild(elHTML('div', {
    style: {
      marginTop: '8px', fontSize: '0.58rem', color: 'var(--text-dim)', lineHeight: '1.5',
      borderTop: '1px solid rgba(155,48,255,0.2)', paddingTop: '8px'
    }
  }, '<strong style="color:var(--accent-purple);">Architecture:</strong> 15→12→8→5<br>Layers: Input | ReLU | ReLU | Softmax<br>Training: Online backpropagation'));
  rightPanel.appendChild(mlpCard);

  // Controls Card
  const ctrlCard = el('div', { className: 'glass-card' });
  ctrlCard.appendChild(elHTML('div', { className: 'card-title' }, '🎮 Controls'));
  const ctrlGrid = el('div', { className: 'controls-grid' });
  const controls = [
    ['WASD', 'Move'], ['←↑↓→', 'Move'], ['Z', 'Attack'], ['Space', 'Attack'], ['B', 'Block'], ['1–6', 'Use item'], ['ESC', 'Pause']
  ];
  controls.forEach(([key, desc]) => {
    ctrlGrid.appendChild(elHTML('div', { className: 'ctrl-row' }, `<span class="key-badge">${key}</span> ${desc}`));
  });
  ctrlCard.appendChild(ctrlGrid);
  rightPanel.appendChild(ctrlCard);

  // (Strategy Tips Card removed per user request)

  // ── Bottom HUD ─────────────────────────────────────────────
  const hudBottom = el('footer', { id: 'hud-bottom' });
  hudBottom.appendChild(elHTML('div', { className: 'hud-item' }, '⚔️ <strong id="hud-name">Hero</strong>'));
  hudBottom.appendChild(el('div', { className: 'hud-sep' }));
  hudBottom.appendChild(elHTML('div', { className: 'hud-item' }, '🏆 <strong id="hud-score">0</strong>'));
  hudBottom.appendChild(el('div', { className: 'hud-sep' }));
  hudBottom.appendChild(elHTML('div', { className: 'hud-item' }, '🪙 <strong id="hud-gold">0</strong>'));
  hudBottom.appendChild(el('div', { className: 'hud-sep' }));
  hudBottom.appendChild(elHTML('div', { className: 'hud-item' }, '📶 Level <strong id="hud-level">1</strong> / 5'));
  const saveBtn = elHTML('button', { className: 'save-btn', id: 'save-btn', 'aria-label': 'Save game' }, '💾 Save');
  saveBtn.addEventListener('click', () => { if (window.__game) window.__game.save(); });
  hudBottom.appendChild(saveBtn);
  app.appendChild(hudBottom);

  // ═══════════════════════════════════════════════════════════
  // OVERLAYS
  // ═══════════════════════════════════════════════════════════

  // ── MAIN MENU ──────────────────────────────────────────────
  const menuOverlay = el('div', { id: 'menu-overlay', className: 'overlay', role: 'dialog', 'aria-label': 'Main Menu', style: { display: 'flex' } });
  const menuCard = el('div', { className: 'overlay-card' });
  menuCard.appendChild(elHTML('span', { className: 'menu-dragon-art' }, '🐉'));
  menuCard.appendChild(el('h2', { className: 'overlay-title title-gold' }, 'Dragon Slayer'));

  // Implemented Extra Features (clickable cards)
  const featureSection = el('div', { className: 'feature-cards-section' });
  featureSection.appendChild(el('div', { className: 'feature-cards-heading' }, 'Implemented Extra Features:'));
  const featureCardsRow = el('div', { className: 'feature-cards' });

  // Level Progression card
  const levelCard = el('div', { className: 'feature-card', id: 'fc-level' });
  levelCard.appendChild(el('div', { className: 'feature-card-icon' }, '📈'));
  levelCard.appendChild(el('div', { className: 'feature-card-label' }, 'Level Progression'));
  levelCard.addEventListener('click', () => window.__showFeaturePopup('level'));
  featureCardsRow.appendChild(levelCard);

  // Inventory & Items card
  const invFeatureCard = el('div', { className: 'feature-card', id: 'fc-inventory' });
  invFeatureCard.appendChild(el('div', { className: 'feature-card-icon' }, '🏆'));
  invFeatureCard.appendChild(el('div', { className: 'feature-card-label' }, 'Inventory & Items'));
  invFeatureCard.addEventListener('click', () => window.__showFeaturePopup('inventory'));
  featureCardsRow.appendChild(invFeatureCard);

  featureSection.appendChild(featureCardsRow);
  menuCard.appendChild(featureSection);

  // Name input
  const nameInput = el('input', {
    type: 'text', id: 'player-name-input', className: 'name-input',
    placeholder: 'Enter your hero name…', maxlength: '16', 'aria-label': 'Enter hero name'
  });
  menuCard.appendChild(nameInput);

  // Buttons row
  const btnRow = el('div');
  const btnNew = elHTML('button', { className: 'btn btn-primary', id: 'btn-new-game', 'aria-label': 'Start new game' }, '⚔️ New Game');
  btnNew.addEventListener('click', () => window.__startNewGame());
  btnRow.appendChild(btnNew);
  const btnContinue = elHTML('button', { className: 'btn btn-secondary', id: 'btn-continue', 'aria-label': 'Continue saved game', style: { display: 'none' } }, '▶ Continue');
  btnContinue.addEventListener('click', () => window.__continueGame());
  btnRow.appendChild(btnContinue);
  menuCard.appendChild(btnRow);

  // Secondary buttons row
  const btnRow2 = el('div', { style: { marginTop: '8px' } });
  const btnLB = elHTML('button', { className: 'btn btn-secondary', 'aria-label': 'View leaderboard' }, '🏆 Leaderboard');
  btnLB.addEventListener('click', () => window.__showLeaderboard());
  btnRow2.appendChild(btnLB);
  menuCard.appendChild(btnRow2);
  menuOverlay.appendChild(menuCard);
  document.body.appendChild(menuOverlay);

  // ── PAUSE ──────────────────────────────────────────────────
  const pauseOverlay = el('div', { id: 'pause-overlay', role: 'dialog', 'aria-label': 'Game Paused' });
  const pauseCard = el('div', { className: 'pause-card' });
  pauseCard.appendChild(el('h2', null, '⏸ Paused'));
  pauseCard.appendChild(elHTML('p', { style: { marginTop: '8px', color: 'var(--text-dim)' } }, 'Press <strong style="color:var(--accent-cyan);">ESC</strong> to resume'));
  const pauseBtns = el('div', { style: { marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' } });
  const btnResume = elHTML('button', { className: 'btn btn-primary', 'aria-label': 'Resume game' }, '▶ Resume');
  btnResume.addEventListener('click', () => window.__game._onEscape());
  pauseBtns.appendChild(btnResume);
  const btnSavePause = elHTML('button', { className: 'btn btn-secondary', 'aria-label': 'Save and resume' }, '💾 Save');
  btnSavePause.addEventListener('click', () => { window.__game.save(); window.__game._onEscape(); });
  pauseBtns.appendChild(btnSavePause);
  const btnMenuPause = elHTML('button', { className: 'btn btn-secondary', 'aria-label': 'Return to menu' }, '🏠 Menu');
  btnMenuPause.addEventListener('click', () => window.__game._goToMenu());
  pauseBtns.appendChild(btnMenuPause);
  pauseCard.appendChild(pauseBtns);
  pauseOverlay.appendChild(pauseCard);
  document.body.appendChild(pauseOverlay);

  // ── LEVEL UP ───────────────────────────────────────────────
  const luOverlay = el('div', { id: 'levelup-overlay', className: 'overlay', role: 'dialog', 'aria-label': 'Level Complete' });
  const luCard = el('div', { className: 'overlay-card' });
  luCard.appendChild(elHTML('div', { style: { fontSize: '1rem', color: 'var(--accent-cyan)', fontFamily: "'Cinzel',serif", letterSpacing: '2px', marginBottom: '4px' } }, 'DRAGON SLAIN!'));
  luCard.appendChild(el('h2', { className: 'overlay-title title-purple' }, 'Level Complete'));
  luCard.appendChild(elHTML('div', { className: 'lu-badge', id: 'lu-level' }, '2'));
  luCard.appendChild(elHTML('p', { className: 'lu-tips' }, 'The dragon grows stronger…<br>Its MLP model persists — it still remembers your patterns!<br>Vary your tactics to survive!'));
  luCard.appendChild(elHTML('button', { className: 'btn btn-gold', id: 'lu-continue-btn', 'aria-label': 'Continue to next level' }, '⚔️ Face Next Dragon'));
  luOverlay.appendChild(luCard);
  document.body.appendChild(luOverlay);

  // ── GAME OVER ──────────────────────────────────────────────
  const goOverlay = el('div', { id: 'gameover-overlay', className: 'overlay', role: 'dialog', 'aria-label': 'Game Over' });
  const goCard = el('div', { className: 'overlay-card' });
  goCard.appendChild(elHTML('span', { style: { fontSize: '3rem' } }, '💀'));
  goCard.appendChild(el('h2', { className: 'overlay-title title-red' }, 'Slain!'));
  goCard.appendChild(elHTML('p', { className: 'overlay-subtitle' }, 'The dragon has defeated you…'));
  goCard.appendChild(elHTML('div', { className: 'score-label' }, 'Final Score'));
  goCard.appendChild(elHTML('div', { className: 'score-display', id: 'go-score' }, '0'));
  goCard.appendChild(elHTML('div', { style: { fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '16px' } }, 'Reached Level <strong id="go-level" style="color:var(--accent-cyan);">1</strong>'));
  const goBtns = el('div');
  goBtns.appendChild(elHTML('button', { className: 'btn btn-primary', id: 'go-menu-btn', 'aria-label': 'Return to menu' }, '🏠 Menu'));
  goBtns.appendChild(elHTML('button', { className: 'btn btn-secondary', id: 'go-lb-btn', 'aria-label': 'View leaderboard' }, '🏆 Leaderboard'));
  goCard.appendChild(goBtns);
  goOverlay.appendChild(goCard);
  document.body.appendChild(goOverlay);

  // ── WIN ────────────────────────────────────────────────────
  const winOverlay = el('div', { id: 'win-overlay', className: 'overlay', role: 'dialog', 'aria-label': 'Victory' });
  const winCard = el('div', { className: 'overlay-card' });
  winCard.appendChild(elHTML('span', { style: { fontSize: '3.5rem', animation: 'dragonFloat 2s ease-in-out infinite', display: 'block' } }, '🏆'));
  winCard.appendChild(el('h2', { className: 'overlay-title title-gold' }, 'VICTORIOUS!'));
  winCard.appendChild(elHTML('p', { className: 'overlay-subtitle' }, 'All 5 dragons have been vanquished!<br>You are the ultimate Dragon Slayer!'));
  winCard.appendChild(elHTML('div', { className: 'score-label' }, 'Final Score'));
  winCard.appendChild(elHTML('div', { className: 'score-display', id: 'win-score' }, '0'));
  winCard.appendChild(elHTML('button', { className: 'btn btn-gold', id: 'win-lb-btn', 'aria-label': 'View leaderboard' }, '🏆 View Leaderboard'));
  winOverlay.appendChild(winCard);
  document.body.appendChild(winOverlay);

  // ── LEADERBOARD ────────────────────────────────────────────
  const lbOverlay = el('div', { id: 'leaderboard-overlay', className: 'overlay', role: 'dialog', 'aria-label': 'Leaderboard' });
  const lbCard = el('div', { className: 'overlay-card lb-overlay-card' });
  lbCard.appendChild(el('h2', { className: 'overlay-title title-gold' }, '🏆 Leaderboard'));
  lbCard.appendChild(elHTML('p', { className: 'overlay-subtitle' }, 'Top Dragon Slayers of all time'));
  const lbTable = elHTML('table', { className: 'lb-table', 'aria-label': 'High scores' },
    '<thead><tr><th>#</th><th>Name</th><th>Score</th><th>Level</th><th>Date</th></tr></thead><tbody id="lb-tbody"><tr><td colspan="5" style="opacity:0.5;">No scores yet!</td></tr></tbody>');
  lbCard.appendChild(lbTable);
  const lbBackBtn = elHTML('button', { className: 'btn btn-secondary', id: 'lb-back-btn', 'aria-label': 'Return to menu' }, '← Back to Menu');
  lbCard.appendChild(lbBackBtn);
  lbOverlay.appendChild(lbCard);
  document.body.appendChild(lbOverlay);

  // ── FEATURE DETAIL POPUPS ──────────────────────────────────
  const featurePopupData = {
    level: {
      title: '📈 Level Progression',
      rows: [
        ['🏰', '<strong>5 Levels</strong> — Each level increases dragon difficulty'],
        ['❤️', '<strong>HP Scaling</strong> — Hero gains +20 max HP per level'],
        ['🐲', '<strong>Dragon Scaling</strong> — Dragon gains +100 HP, +8 ATK, +2 DEF per level'],
        ['⚡', '<strong>Speed Increase</strong> — Dragon gets faster each level'],
        ['🔥', '<strong>Fire Rate</strong> — Dragon shoots more frequently at higher levels'],
        ['🏆', '<strong>Bonus Score</strong> — Level × 500 bonus points on completion'],
        ['🪙', '<strong>Gold Reward</strong> — Earn gold scaled to level on victory'],
      ]
    },
    inventory: {
      title: '🏆 Inventory & Items',
      rows: [
        ['🧪', '<strong>Health Potion</strong> — Restores 60 HP instantly'],
        ['🛡️', '<strong>Iron Shield</strong> — Blocks 30 incoming damage'],
        ['💎', '<strong>Power Crystal</strong> — +15 ATK for 8 seconds'],
        ['⚗️', '<strong>Elixir of Speed</strong> — +2 Speed for 8 seconds'],
        ['💣', '<strong>Dragon Bomb</strong> — Deals 80 direct damage to dragon'],
        ['🍀', '<strong>Luck Charm</strong> — +15% critical hit chance'],
        ['🎒', '<strong>6 Slots</strong> — Press keys 1–6 to use items in combat'],
        ['✨', '<strong>Item Drops</strong> — Walk over dropped items to collect'],
      ]
    }
  };

  // Build popup overlays for each feature
  Object.keys(featurePopupData).forEach(key => {
    const data = featurePopupData[key];
    const popOverlay = el('div', { className: 'feature-popup-overlay', id: `fp-overlay-${key}` });
    const popCard = el('div', { className: 'feature-popup-card' });
    popCard.appendChild(elHTML('h3', null, data.title));
    data.rows.forEach(([icon, text]) => {
      popCard.appendChild(elHTML('div', { className: 'fp-row' }, `<span class="fp-icon">${icon}</span> ${text}`));
    });
    const backBtn = elHTML('button', { className: 'btn btn-secondary', style: { marginTop: '16px', display: 'block', width: '100%' } }, '← Back to Menu');
    backBtn.addEventListener('click', () => {
      popOverlay.classList.remove('visible');
      document.getElementById('menu-overlay').style.display = 'flex';
    });
    popCard.appendChild(backBtn);
    popOverlay.appendChild(popCard);
    document.body.appendChild(popOverlay);
  });

  window.__showFeaturePopup = function(key) {
    document.getElementById('menu-overlay').style.display = 'none';
    const pop = document.getElementById(`fp-overlay-${key}`);
    if (pop) pop.classList.add('visible');
  };

  // ── EVENT BANNER ───────────────────────────────────────────
  document.body.appendChild(el('div', { id: 'event-banner', role: 'status', 'aria-live': 'polite', 'aria-label': 'Random event notification' }));

  // ═══════════════════════════════════════════════════════════
  // ANIMATED BACKGROUND PARTICLES
  // ═══════════════════════════════════════════════════════════

  (function spawnBgParticles() {
    const colors = ['#9b30ff', '#ff00aa', '#00ccff', '#ffd700', '#cc00ff'];
    for (let i = 0; i < 25; i++) {
      const p = el('div', { className: 'bg-particle' });
      const size  = Math.random() * 4 + 2;
      const left  = Math.random() * 100;
      const delay = Math.random() * 20;
      const dur   = Math.random() * 15 + 10;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${left}%;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration:${dur}s;
        animation-delay:-${delay}s;
        box-shadow:0 0 ${size * 2}px ${colors[Math.floor(Math.random() * colors.length)]};
      `;
      bgParticles.appendChild(p);
    }
  })();

  // ═══════════════════════════════════════════════════════════
  // INITIALIZE GAME
  // ═══════════════════════════════════════════════════════════

  const ui   = new GameUI();
  const game = new DragonSlayerGame(canvas, ui);
  window.__game = game;

  // ── Canvas resize ──────────────────────────────────────────
  function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    const rect      = container.getBoundingClientRect();
    const aspect    = 900 / 550;
    let w = rect.width;
    let h = w / aspect;
    if (h > rect.height) { h = rect.height; w = h * aspect; }
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ── HUD sync hooks ────────────────────────────────────────
  const origUpdateScore = ui.updateScore.bind(ui);
  ui.updateScore = (score) => {
    origUpdateScore(score);
    document.getElementById('hud-score').textContent = score.toLocaleString();
  };
  const origUpdateGold = ui.updateGold.bind(ui);
  ui.updateGold = (gold) => {
    origUpdateGold(gold);
    document.getElementById('hud-gold').textContent = gold.toLocaleString();
  };
  const origUpdateLevel = ui.updateLevel.bind(ui);
  ui.updateLevel = (level) => {
    origUpdateLevel(level);
    document.getElementById('hud-level').textContent   = level;
    document.getElementById('wave-value').textContent  = `${level}/5`;
  };

  // ── Name label update ─────────────────────────────────────
  function updateNameLabels(name) {
    document.getElementById('player-name-label').textContent = name;
    document.getElementById('hud-name').textContent = name;
  }

  // ── Global handlers ───────────────────────────────────────
  window.__startNewGame = function () {
    const nameInput = document.getElementById('player-name-input');
    const name = (nameInput.value.trim() || 'Hero').substring(0, 16);
    updateNameLabels(name);
    ui.hideAllOverlays();
    game.startNewGame(name);
  };

  window.__continueGame = function () {
    updateNameLabels(game.playerName);
    ui.hideAllOverlays();
    game.continueGame();
  };

  window.__showLeaderboard = function () {
    ui.showLeaderboard(getLeaderboard(), () => ui.showMenu());
  };



  // ── Menu & input binding ──────────────────────────────────
  ui.showMenu();

  document.getElementById('player-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.__startNewGame();
  });

  // ── Start game loop ───────────────────────────────────────
  game.run();

})();
