/**
 * ui.js — HUD, menus, overlays, and panels for Dragon Slayer
 */

"use strict";

class GameUI {
  constructor() {
    // Cache DOM references
    this.playerHPBar    = document.getElementById('player-hp-bar');
    this.playerHPText   = document.getElementById('player-hp-text');
    this.dragonHPBar    = document.getElementById('dragon-hp-bar');
    this.dragonHPText   = document.getElementById('dragon-hp-text');
    this.scoreEl        = document.getElementById('score-value');
    this.goldEl         = document.getElementById('gold-value');
    this.levelEl        = document.getElementById('level-value');
    this.inventoryEl    = document.getElementById('inventory-slots');
    this.mlpPredEl      = document.getElementById('mlp-prediction');
    this.mlpConfEl      = document.getElementById('mlp-confidence');
    this.mlpAccEl       = document.getElementById('mlp-accuracy');
    this.mlpTrainEl     = document.getElementById('mlp-train-steps');
    this.probBars = [
      document.getElementById('prob-left'),
      document.getElementById('prob-right'),
      document.getElementById('prob-up'),
      document.getElementById('prob-down'),
      document.getElementById('prob-none'),
    ];
    this.eventBanner    = document.getElementById('event-banner');
    this.pauseOverlay   = document.getElementById('pause-overlay');
    this.hasSave        = false;
  }

  setHasSave(val) {
    this.hasSave = val;
    const btn = document.getElementById('btn-continue');
    if (btn) btn.style.display = val ? 'block' : 'none';
  }

  updateHP(pHP, pMax, dHP, dMax) {
    const pPct = Math.max(0, (pHP / pMax) * 100);
    const dPct = Math.max(0, (dHP / dMax) * 100);

    this.playerHPBar.style.width = pPct + '%';
    this.playerHPBar.style.background = pPct > 50
      ? 'linear-gradient(90deg,#00ff88,#00cc66)'
      : pPct > 25
        ? 'linear-gradient(90deg,#ffcc00,#ff8800)'
        : 'linear-gradient(90deg,#ff4444,#cc0000)';
    this.playerHPText.textContent = `${Math.ceil(pHP)} / ${pMax}`;

    this.dragonHPBar.style.width = dPct + '%';
    this.dragonHPBar.style.background = dPct > 50
      ? 'linear-gradient(90deg,#cc00ff,#8800cc)'
      : dPct > 25
        ? 'linear-gradient(90deg,#ff8800,#ff4400)'
        : 'linear-gradient(90deg,#ff2200,#880000)';
    this.dragonHPText.textContent = `${Math.ceil(dHP)} / ${dMax}`;
  }

  updateScore(score) {
    if (this.scoreEl) this.scoreEl.textContent = score.toLocaleString();
  }

  updateGold(gold) {
    if (this.goldEl) this.goldEl.textContent = gold.toLocaleString();
  }

  updateLevel(level) {
    if (this.levelEl) this.levelEl.textContent = level;
  }

  updateInventory(inventory) {
    if (!this.inventoryEl) return;
    this.inventoryEl.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.id = `inv-slot-${i}`;
      if (inventory[i]) {
        const it = inventory[i];
        slot.innerHTML = `<span class="inv-icon">${it.icon}</span>
          <span class="inv-key">[${i + 1}]</span>
          <div class="inv-tooltip">${it.name}<br><small>${it.desc}</small></div>`;
        slot.classList.add('filled');
      }
      this.inventoryEl.appendChild(slot);
    }
  }

  updateMLPInfo(dragon, mlp) {
    if (!this.mlpPredEl) return;
    const MOVE_NAMES = ['← Left', '→ Right', '↑ Up', '↓ Down', '• None'];
    this.mlpPredEl.textContent  = MOVE_NAMES[dragon.prediction] || '?';
    this.mlpConfEl.textContent  = (dragon.confidence * 100).toFixed(1) + '%';
    this.mlpAccEl.textContent   = (mlp.accuracy * 100).toFixed(1) + '%';
    this.mlpTrainEl.textContent = mlp.totalTrainSteps;

    // Probability bars
    dragon.allProbs.forEach((p, i) => {
      if (this.probBars[i]) this.probBars[i].style.width = (p * 100).toFixed(1) + '%';
    });
  }

  showEventBanner(ev) {
    if (!this.eventBanner) return;
    this.eventBanner.innerHTML = `<span class="ev-icon">${ev.icon}</span>
      <div><strong>${ev.name}</strong><br><small>${ev.desc}</small></div>`;
    this.eventBanner.classList.add('visible');
    setTimeout(() => this.eventBanner.classList.remove('visible'), 3000);
  }

  showPause(visible) {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.style.display = visible ? 'flex' : 'none';
  }

  hideAllOverlays() {
    ['menu-overlay','gameover-overlay','win-overlay','levelup-overlay','leaderboard-overlay']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    // Feature popups use classList 'visible'
    ['fp-overlay-level','fp-overlay-inventory'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('visible');
    });
    this.showPause(false);
  }

  showMenu() {
    this.hideAllOverlays();
    const el = document.getElementById('menu-overlay');
    if (el) el.style.display = 'flex';
  }

  showGameOver(score, level, onBack) {
    const el = document.getElementById('gameover-overlay');
    if (!el) return;
    this.hideAllOverlays();
    el.style.display = 'flex';
    const s = document.getElementById('go-score');
    const l = document.getElementById('go-level');
    if (s) s.textContent = score.toLocaleString();
    if (l) l.textContent = level;
    const btn = document.getElementById('go-menu-btn');
    if (btn) { btn.onclick = onBack; }
    const btn2 = document.getElementById('go-lb-btn');
    if (btn2) btn2.onclick = () => {
      // getLeaderboard is defined globally in game.js scope via window
      const board = typeof getLeaderboard === 'function' ? getLeaderboard() : [];
      this.showLeaderboard(board, onBack);
    };
  }

  showWin(score, onLB) {
    const el = document.getElementById('win-overlay');
    if (!el) return;
    this.hideAllOverlays();
    el.style.display = 'flex';
    const s = document.getElementById('win-score');
    if (s) s.textContent = score.toLocaleString();
    const btn = document.getElementById('win-lb-btn');
    if (btn) btn.onclick = onLB;
  }

  showLevelUp(level, onContinue) {
    const el = document.getElementById('levelup-overlay');
    if (!el) return;
    this.hideAllOverlays();
    el.style.display = 'flex';
    const lv = document.getElementById('lu-level');
    if (lv) lv.textContent = level;
    const btn = document.getElementById('lu-continue-btn');
    if (btn) btn.onclick = () => { this.hideAllOverlays(); onContinue(); };
  }

  showLeaderboard(board, onBack) {
    const el = document.getElementById('leaderboard-overlay');
    if (!el) return;
    this.hideAllOverlays();
    el.style.display = 'flex';
    const tbody = document.getElementById('lb-tbody');
    if (tbody) {
      tbody.innerHTML = board.length
        ? board.map((e, i) => `
          <tr class="${i === 0 ? 'lb-gold' : i === 1 ? 'lb-silver' : i === 2 ? 'lb-bronze' : ''}">
            <td>${i + 1}</td>
            <td>${e.name}</td>
            <td>${e.score.toLocaleString()}</td>
            <td>${e.level}</td>
            <td>${e.date}</td>
          </tr>`).join('')
        : '<tr><td colspan="5" style="opacity:0.5">No scores yet. Be the first!</td></tr>';
    }
    const btn = document.getElementById('lb-back-btn');
    if (btn) btn.onclick = onBack;
  }
}
