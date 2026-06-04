/**
 * game.js — Main game engine for Dragon Slayer
 * Features: Health system, Level progression, Inventory, Save/Load,
 *           Leaderboard, Random events, MLP adaptive dragon AI
 */

"use strict";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const CANVAS_W = 900;
const CANVAS_H = 550;

const ITEM_TYPES = {
  POTION:       { id: 'potion',       name: 'Health Potion',   icon: '🧪', heal: 60,  desc: 'Restores 60 HP' },
  SHIELD:       { id: 'shield',       name: 'Iron Shield',     icon: '🛡️', block: 30, desc: 'Blocks 30 damage once' },
  POWERUP:      { id: 'powerup',      name: 'Power Crystal',   icon: '💎', atkBonus: 15, duration: 8, desc: '+15 ATK for 8s' },
  ELIXIR:       { id: 'elixir',       name: 'Elixir of Speed', icon: '⚗️', speedBonus: 2, duration: 8, desc: '+2 Speed for 8s' },
  BOMB:         { id: 'bomb',         name: 'Dragon Bomb',     icon: '💣', dmg: 80,   desc: 'Deals 80 damage' },
  CHARM:        { id: 'charm',        name: 'Luck Charm',      icon: '🍀', luck: 0.15,desc: '+15% crit chance' },
};

const RANDOM_EVENTS = [
  { id: 'meteor',   name: 'Meteor Shower', icon: '☄️',  desc: 'Meteors rain down dealing AoE damage!', effect: 'meteor' },
  { id: 'spring',   name: 'Healing Spring',icon: '💧',  desc: 'A magical spring restores 30 HP!',       effect: 'heal30' },
  { id: 'rage',     name: 'Dragon Rage',   icon: '🔥',  desc: 'The dragon enters a fury!',             effect: 'dragonRage' },
  { id: 'bounty',   name: 'Treasure Drop', icon: '💰',  desc: 'A chest falls — grab it for a bonus!',  effect: 'treasure' },
  { id: 'fog',      name: 'Mystic Fog',    icon: '🌫️',  desc: 'Fog obscures vision for 5 seconds.',    effect: 'fog' },
];

// ═══════════════════════════════════════════════════════════════
// SAVE / LOAD / LEADERBOARD
// ═══════════════════════════════════════════════════════════════

const SAVE_KEY  = 'dragonSlayer_save';
const BOARD_KEY = 'dragonSlayer_leaderboard';

function saveGame(state) {
  const data = {
    playerName:   state.playerName,
    level:        state.level,
    score:        state.score,
    gold:         state.gold,
    inventory:    state.inventory,
    mlpState:     state.dragon.mlp.serialise(),
    timestamp:    Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

function getLeaderboard() {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToLeaderboard(name, score, level) {
  const board = getLeaderboard();
  board.push({ name, score, level, date: new Date().toLocaleDateString() });
  board.sort((a, b) => b.score - a.score);
  board.splice(10); // keep top 10
  localStorage.setItem(BOARD_KEY, JSON.stringify(board));
}

// ═══════════════════════════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════════════════════════

class Player {
  constructor(name = 'Hero') {
    this.name    = name;
    this.maxHp   = 200;
    this.hp      = 200;
    this.baseAtk = 35;
    this.atk     = 35;
    this.speed   = 3.5;
    this.x       = 120;
    this.y       = 250;
    this.w       = 50;
    this.h       = 70;
    this.gold    = 0;

    // Combat states
    this.shieldBlock   = 0;       // remaining block HP
    this.atkBonus      = 0;
    this.atkBonusTimer = 0;
    this.speedBonus    = 0;
    this.speedBonusTimer = 0;
    this.luckBonus     = 0;
    this.invincible    = 0;       // invincibility frames
    this.isAttacking   = false;
    this.attackTimer   = 0;
    this.attackCooldown = 45;     // frames
    this.lastMove      = MOVE.NONE;

    // Animation
    this.facing    = 1;           // 1=right, -1=left
    this.animFrame = 0;
    this.animTimer = 0;
    this.hitFlash  = 0;
    this.particles = [];

    // Blocking
    this.isBlocking      = false;
    this.blockTimer      = 0;
    this.blockDuration   = 30;   // frames of active block
    this.blockCooldown   = 0;
    this.blockCooldownMax = 120; // frames between blocks
  }

  get totalAtk()   { return this.baseAtk + this.atkBonus; }
  get totalSpeed() { return this.speed + this.speedBonus; }
  get hpFraction() { return this.hp / this.maxHp; }
  get isDead()     { return this.hp <= 0; }

  takeDamage(amount) {
    if (this.invincible > 0) return 0;
    let dmg = Math.max(1, amount);
    // Block reduces damage by 50%
    if (this.isBlocking) {
      dmg = Math.floor(dmg * 0.5);
    }
    if (this.shieldBlock > 0) {
      const blocked = Math.min(this.shieldBlock, dmg);
      dmg -= blocked;
      this.shieldBlock -= blocked;
    }
    // Invincibility window after hit
    this.hp = Math.max(0, this.hp - dmg);
    this.invincible = 45;
    this.hitFlash   = 8;
    return dmg;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  applyItem(item) {
    switch (item.id) {
      case 'potion':   this.heal(item.heal); break;
      case 'shield':   this.shieldBlock += item.block; break;
      case 'powerup':  this.atkBonus = item.atkBonus; this.atkBonusTimer = item.duration * 60; break;
      case 'elixir':   this.speedBonus = item.speedBonus; this.speedBonusTimer = item.duration * 60; break;
      case 'charm':    this.luckBonus = item.luck; break;
    }
  }

  update(keys, canvasW, canvasH) {
    const spd = this.totalSpeed;
    let moved  = false;
    let moveDir = MOVE.NONE;

    if (keys['ArrowLeft']  || keys['a'] || keys['A']) { this.x -= spd; this.facing = -1; moveDir = MOVE.LEFT;  moved = true; }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) { this.x += spd; this.facing =  1; moveDir = MOVE.RIGHT; moved = true; }
    if (keys['ArrowUp']    || keys['w'] || keys['W']) { this.y -= spd; moveDir = MOVE.UP;    moved = true; }
    if (keys['ArrowDown']  || keys['s'] || keys['S']) { this.y += spd; moveDir = MOVE.DOWN;  moved = true; }

    // Clamp to canvas
    this.x = Math.max(0, Math.min(canvasW - this.w, this.x));
    this.y = Math.max(0, Math.min(canvasH - this.h - 60, this.y));

    // Cooldowns
    if (this.attackTimer > 0)      this.attackTimer--;
    if (this.invincible  > 0)      this.invincible--;
    if (this.hitFlash    > 0)      this.hitFlash--;
    if (this.atkBonusTimer   > 0) { this.atkBonusTimer--;   if (this.atkBonusTimer   === 0) this.atkBonus   = 0; }
    if (this.speedBonusTimer > 0) { this.speedBonusTimer--; if (this.speedBonusTimer === 0) this.speedBonus = 0; }

    // Block timer
    if (this.blockTimer > 0) {
      this.blockTimer--;
      if (this.blockTimer === 0) {
        this.isBlocking = false;
        this.blockCooldown = this.blockCooldownMax;
      }
    }
    if (this.blockCooldown > 0) this.blockCooldown--;

    // Animation
    this.animTimer++;
    if (this.animTimer > 8) { this.animTimer = 0; this.animFrame = (this.animFrame + 1) % 4; }

    // Particles
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life--;
      p.alpha = p.life / p.maxLife;
    });

    return moved ? moveDir : MOVE.NONE;
  }

  tryAttack() {
    if (this.attackTimer > 0) return false;
    this.attackTimer = this.attackCooldown;
    this.isAttacking = true;
    // Slash particles
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.x + this.w / 2 + this.facing * 30,
        y: this.y + this.h / 2 + (Math.random() - 0.5) * 40,
        vx: this.facing * (Math.random() * 4 + 2),
        vy: (Math.random() - 0.5) * 3,
        life: 18, maxLife: 18, alpha: 1,
        color: '#ffe066', size: Math.random() * 6 + 3,
      });
    }
    return true;
  }

  get attackHitbox() {
    const reach = 80;
    return {
      x: this.facing > 0 ? this.x + this.w : this.x - reach,
      y: this.y + 10,
      w: reach,
      h: this.h - 20,
    };
  }

  tryBlock() {
    if (this.blockCooldown > 0 || this.isBlocking) return false;
    this.isBlocking = true;
    this.blockTimer = this.blockDuration;
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════
// GAME ENGINE
// ═══════════════════════════════════════════════════════════════

class DragonSlayerGame {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.ui     = ui;

    this.state  = 'menu';   // menu | story | playing | paused | levelup | gameover | win | leaderboard
    this.keys   = {};
    this.level  = 1;
    this.maxLevels = 5;
    this.score  = 0;
    this.gold   = 0;
    this.playerName = 'Hero';
    this.inventory  = [];
    this.maxInventory = 6;

    // MLP + Dragon
    this.mlp    = new MLP([15, 12, 8, 5], 0.06);
    this.dragon = null;
    this.player = null;

    // Projectiles fired by dragon
    this.projectiles = [];
    // Player slash attacks
    this.slashes = [];
    // Dropped items on field
    this.fieldItems = [];
    // Random event state
    this.eventTimer    = 0;
    this.eventInterval = 900; // frames (~15s)
    this.activeEvent   = null;
    this.eventDisplay  = 0;
    // Fog effect
    this.fogAlpha   = 0;
    this.fogTimer   = 0;
    // Meteors
    this.meteors    = [];
    // Floating text
    this.floatingTexts = [];
    // Frame counter
    this.frame = 0;
    // Background scroll
    this.bgOffset = 0;

    this._bindInput();
    this._loadSaved();
  }

  // ─── Input ────────────────────────────────────────────────────

  _bindInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (e.key === ' ' || e.key === 'z' || e.key === 'Z') {
        this._onAttack();
      }
      if (e.key === 'b' || e.key === 'B') {
        this._onBlock();
      }
      if (e.key === 'Escape') this._onEscape();
      if (e.key >= '1' && e.key <= '6') {
        this._useInventorySlot(parseInt(e.key) - 1);
      }
      // Only prevent default during gameplay to allow typing in name input
      if (this.state === 'playing' || this.state === 'paused') {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });
  }

  _onAttack() {
    if (this.state !== 'playing') return;
    if (this.player.tryAttack()) {
      this.slashes.push({
        x: this.player.attackHitbox.x,
        y: this.player.attackHitbox.y,
        w: this.player.attackHitbox.w,
        h: this.player.attackHitbox.h,
        life: 12, maxLife: 12,
        facing: this.player.facing,
        active: true,
      });
    }
  }

  _onEscape() {
    if (this.state === 'playing')  { this.state = 'paused'; this.ui.showPause(true); }
    else if (this.state === 'paused') { this.state = 'playing'; this.ui.showPause(false); }
  }

  _onBlock() {
    if (this.state !== 'playing') return;
    this.player.tryBlock();
  }

  // ─── Save / Load ──────────────────────────────────────────────

  _loadSaved() {
    const data = loadGame();
    if (data) {
      this.playerName = data.playerName || 'Hero';
      this.level      = data.level      || 1;
      this.score      = data.score      || 0;
      this.gold       = data.gold       || 0;
      this.inventory  = data.inventory  || [];
      if (data.mlpState) {
        this.mlp = MLP.deserialise(data.mlpState);
      }
      this.ui.setHasSave(true);
    }
  }

  save() {
    // proxy dragon's mlp
    const proxy = { dragon: { mlp: this.mlp } };
    saveGame({
      playerName: this.playerName,
      level:      this.level,
      score:      this.score,
      gold:       this.gold,
      inventory:  this.inventory,
      dragon:     proxy.dragon,
    });
    this._floatText(this.player.x, this.player.y - 40, 'Game Saved!', '#00ffcc');
  }

  // ─── Game Flow ────────────────────────────────────────────────

  startNewGame(name) {
    this.playerName = name || 'Hero';
    this.level      = 1;
    this.score      = 0;
    this.gold       = 0;
    this.inventory  = [];
    this.mlp        = new MLP([15, 12, 8, 5], 0.06);
    clearSave();
    this._startLevel();
  }

  continueGame() {
    this._startLevel();
  }

  _startLevel() {
    this.state = 'playing';
    this.frame = 0;

    this.player = new Player(this.playerName);
    if (this.level > 1) {
      this.player.maxHp = 200 + (this.level - 1) * 20;
      this.player.hp    = this.player.maxHp;
    }

    this.dragon = new DragonAI(this.mlp);
    this.dragon.scaleToLevel(this.level);
    this.dragon.x = CANVAS_W - 180;
    this.dragon.y = 120;

    this.projectiles   = [];
    this.slashes       = [];
    this.fieldItems    = [];
    this.meteors       = [];
    this.floatingTexts = [];
    this.eventTimer    = 0;
    this.activeEvent   = null;
    this.eventDisplay  = 0;
    this.fogAlpha      = 0;
    this.fogTimer      = 0;

    this.ui.updateLevel(this.level);
    this.ui.updateScore(this.score);
    this.ui.updateGold(this.gold);
    this.ui.updateInventory(this.inventory);
    this.ui.showPause(false);
    this.ui.hideAllOverlays();
  }

  nextLevel() {
    this.level++;
    if (this.level > this.maxLevels) {
      this._win();
    } else {
      this.ui.showLevelUp(this.level, () => this._startLevel());
      this.state = 'levelup';
    }
  }

  _win() {
    this.state = 'win';
    addToLeaderboard(this.playerName, this.score, this.level - 1);
    clearSave();
    this.ui.showWin(this.score, () => this._showLeaderboard());
  }

  _gameOver() {
    this.state = 'gameover';
    addToLeaderboard(this.playerName, this.score, this.level);
    clearSave();
    this.ui.showGameOver(this.score, this.level, () => this._goToMenu());
  }

  _goToMenu() {
    this.state = 'menu';
    this.ui.showMenu();
  }

  _showLeaderboard() {
    this.state = 'leaderboard';
    this.ui.showLeaderboard(getLeaderboard(), () => this._goToMenu());
  }

  // ─── Inventory ────────────────────────────────────────────────

  _addItem(itemType) {
    if (this.inventory.length >= this.maxInventory) return;
    this.inventory.push({ ...itemType });
    this.ui.updateInventory(this.inventory);
  }

  _useInventorySlot(idx) {
    if (this.state !== 'playing') return;
    const item = this.inventory[idx];
    if (!item) return;

    if (item.id === 'bomb') {
      const dmg = this.dragon.takeDamage(item.dmg);
      this.score += dmg * 10;
      this._floatText(this.dragon.x + 50, this.dragon.y - 20, `-${dmg} HP`, '#ff4400');
    } else {
      this.player.applyItem(item);
      this._floatText(this.player.x, this.player.y - 20, `Used ${item.name}!`, '#ffe066');
    }
    this.inventory.splice(idx, 1);
    this.ui.updateInventory(this.inventory);
    this.ui.updateScore(this.score);
  }

  // ─── Random Events ────────────────────────────────────────────

  _triggerRandomEvent() {
    const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    this.activeEvent  = ev;
    this.eventDisplay = 180; // 3s display

    switch (ev.effect) {
      case 'meteor':
        for (let i = 0; i < 6; i++) {
          this.meteors.push({
            x: Math.random() * CANVAS_W,
            y: -30,
            vy: 6 + Math.random() * 3,
            r: 12 + Math.random() * 8,
            life: 120,
          });
        }
        break;
      case 'heal30':
        this.player.heal(30);
        this._floatText(this.player.x, this.player.y - 40, '+30 HP', '#00ff88');
        break;
      case 'dragonRage':
        this.dragon.rageMode = true;
        this.dragon.atk  = Math.round(this.dragon.atk * 1.3);
        break;
      case 'treasure':
        this._spawnItem(Math.random() * 400 + 100, Math.random() * 200 + 150);
        break;
      case 'fog':
        this.fogAlpha = 0.55;
        this.fogTimer = 300; // 5s
        break;
    }

    this.ui.showEventBanner(ev);
  }

  _spawnItem(x, y) {
    const types = Object.values(ITEM_TYPES);
    const type  = types[Math.floor(Math.random() * types.length)];
    this.fieldItems.push({ ...type, x, y, w: 32, h: 32, bob: 0, bobDir: 1 });
  }

  // ─── Floating Text ────────────────────────────────────────────

  _floatText(x, y, text, color = '#fff') {
    this.floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60 });
  }

  // ─── Collision Helpers ───────────────────────────────────────

  static _rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // ─── Main Update ─────────────────────────────────────────────

  update() {
    if (this.state !== 'playing') return;

    this.frame++;
    this.bgOffset = (this.bgOffset + 0.3) % CANVAS_W;

    const dt = 1; // fixed timestep (frame-based)

    // ── Player movement ─────────────────────────────────────────
    const moveDir = this.player.update(this.keys, CANVAS_W, CANVAS_H);

    // Record move to MLP (if a directional move occurred)
    if (moveDir !== MOVE.NONE) {
      this.dragon.recordPlayerMove(moveDir);
    }

    // ── Dragon fire ─────────────────────────────────────────────
    this.dragon.update(this.player, dt);
    const proj = this.dragon.tryFire(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2
    );
    if (proj) this.projectiles.push(proj);

    // ── Update projectiles ───────────────────────────────────────
    this.projectiles.forEach(p => {
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > p.speed) {
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;
      } else {
        p.x = p.tx; p.y = p.ty;
        p.expired = true;
      }
    });

    // ── Projectile → Player collision ───────────────────────────
    this.projectiles.forEach(p => {
      if (p.expired) return;
      if (DragonSlayerGame._rectsOverlap(
        p.x - p.r, p.y - p.r, p.r * 2, p.r * 2,
        this.player.x, this.player.y, this.player.w, this.player.h
      )) {
        const dmg = this.player.takeDamage(p.dmg);
        if (dmg > 0) {
          this._floatText(this.player.x, this.player.y - 30, `-${dmg}`, '#ff4444');
        }
        p.expired = true;
      }
    });
    this.projectiles = this.projectiles.filter(p => !p.expired);

    // ── Slash → Dragon collision ─────────────────────────────────
    this.slashes.forEach(s => {
      s.life--;
      if (s.active && s.life < s.maxLife - 2) {
        if (DragonSlayerGame._rectsOverlap(
          s.x, s.y, s.w, s.h,
          this.dragon.x, this.dragon.y, this.dragon.w, this.dragon.h
        )) {
          // Crit check
          const isCrit = Math.random() < 0.15 + this.player.luckBonus;
          const rawDmg = this.player.totalAtk * (isCrit ? 2 : 1);
          const dmg    = this.dragon.takeDamage(rawDmg);
          this.score  += dmg * 10;
          const label  = isCrit ? `CRIT! -${dmg}` : `-${dmg}`;
          const color  = isCrit ? '#ffd700' : '#ffe066';
          this._floatText(this.dragon.x + 40, this.dragon.y - 20, label, color);
          s.active = false;
        }
      }
    });
    this.slashes = this.slashes.filter(s => s.life > 0);

    // ── Field items ──────────────────────────────────────────────
    this.fieldItems.forEach(it => {
      it.bob += it.bobDir * 0.05;
      if (Math.abs(it.bob) > 5) it.bobDir *= -1;
    });
    this.fieldItems = this.fieldItems.filter(it => {
      const picked = DragonSlayerGame._rectsOverlap(
        it.x, it.y + it.bob, it.w, it.h,
        this.player.x, this.player.y, this.player.w, this.player.h
      );
      if (picked) {
        this._addItem(it);
        this._floatText(this.player.x, this.player.y - 40, `Got ${it.name}!`, '#00ffcc');
        return false;
      }
      return true;
    });

    // ── Meteors ──────────────────────────────────────────────────
    this.meteors.forEach(m => {
      m.y += m.vy;
      m.life--;
      if (m.y > CANVAS_H - 80) {
        if (DragonSlayerGame._rectsOverlap(
          m.x - m.r, m.y - m.r, m.r * 2, m.r * 2,
          this.player.x, this.player.y, this.player.w, this.player.h
        )) {
          const dmg = this.player.takeDamage(25);
          if (dmg > 0) this._floatText(this.player.x, this.player.y - 30, `-${dmg}`, '#ff8800');
        }
        if (DragonSlayerGame._rectsOverlap(
          m.x - m.r, m.y - m.r, m.r * 2, m.r * 2,
          this.dragon.x, this.dragon.y, this.dragon.w, this.dragon.h
        )) {
          const dmg = this.dragon.takeDamage(20);
          this._floatText(this.dragon.x + 30, this.dragon.y - 20, `-${dmg}`, '#ff8800');
          this.score += dmg * 10;
        }
        m.life = 0;
      }
    });
    this.meteors = this.meteors.filter(m => m.life > 0);

    // ── Fog timer ────────────────────────────────────────────────
    if (this.fogTimer > 0) {
      this.fogTimer--;
      if (this.fogTimer === 0) this.fogAlpha = 0;
    }

    // ── Random event timer ───────────────────────────────────────
    this.eventTimer++;
    if (this.eventTimer >= this.eventInterval) {
      this.eventTimer = 0;
      this.eventInterval = 600 + Math.floor(Math.random() * 600);
      this._triggerRandomEvent();
    }
    if (this.eventDisplay > 0) this.eventDisplay--;

    // ── Item drop from dragon damage ─────────────────────────────
    if (this.dragon.hp < this.dragon.maxHp * 0.5 && Math.random() < 0.001) {
      this._spawnItem(Math.random() * 400 + 100, Math.random() * 200 + 150);
    }

    // ── Floating texts ───────────────────────────────────────────
    this.floatingTexts.forEach(t => { t.y -= 0.8; t.life--; });
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

    // ── HUD update ───────────────────────────────────────────────
    this.ui.updateHP(this.player.hp, this.player.maxHp, this.dragon.hp, this.dragon.maxHp);
    this.ui.updateScore(this.score);
    this.ui.updateGold(this.gold);
    this.ui.updateMLPInfo(this.dragon, this.mlp);

    // ── Win / Lose conditions ─────────────────────────────────────
    if (this.player.isDead) {
      this._gameOver();
    } else if (this.dragon.isDead) {
      const bonus = this.level * 500;
      this.score += bonus;
      this.gold  += this.level * 30 + Math.floor(Math.random() * 50);
      this._floatText(CANVAS_W / 2 - 60, CANVAS_H / 2, `+${bonus} Bonus!`, '#ffd700');
      setTimeout(() => this.nextLevel(), 1500);
      this.state = 'levelup'; // pause updates
    }
  }

  // ─── Render ──────────────────────────────────────────────────

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (this.state === 'playing' || this.state === 'levelup') {
      this._drawBackground(ctx);
      this._drawGround(ctx);
      this._drawFieldItems(ctx);
      this._drawDragon(ctx);
      this._drawPlayer(ctx);
      this._drawProjectiles(ctx);
      this._drawSlashes(ctx);
      this._drawMeteors(ctx);
      this._drawFog(ctx);
      this._drawParticles(ctx);
      this._drawFloatingTexts(ctx);
    }
  }

  _drawBackground(ctx) {
    // Gradient sky
    const lvlProgress = (this.level - 1) / (this.maxLevels - 1);
    const r = Math.round(10 + lvlProgress * 40);
    const g = Math.round(5  + lvlProgress * 5);
    const b = Math.round(30 + lvlProgress * 20);
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, `rgb(${r},${g},${b})`);
    grad.addColorStop(1, `rgb(${r + 20},${g + 10},${b + 40})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + this.bgOffset * 0.2) % CANVAS_W);
      const sy = (i * 97) % (CANVAS_H * 0.6);
      const ss = (i % 3 === 0 ? 2 : 1);
      ctx.beginPath();
      ctx.arc(sx, sy, ss, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon / sun based on level
    ctx.save();
    ctx.beginPath();
    const moonX = CANVAS_W * 0.8;
    const moonY = 70;
    const moonR = 40;
    const moonGrad = ctx.createRadialGradient(moonX, moonY, 5, moonX, moonY, moonR);
    moonGrad.addColorStop(0, '#fff5c0');
    moonGrad.addColorStop(1, 'rgba(200,180,60,0)');
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();
    ctx.restore();

    // Distant mountains
    ctx.fillStyle = `rgba(30,15,60,0.7)`;
    ctx.beginPath();
    const pts = [0,400, 100,260, 200,340, 320,220, 450,310, 560,180, 680,280, 800,200, 900,280, 900,400];
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i+1]);
    ctx.closePath();
    ctx.fill();
  }

  _drawGround(ctx) {
    // Ground platform
    const groundY = CANVAS_H - 80;
    const grad = ctx.createLinearGradient(0, groundY, 0, CANVAS_H);
    grad.addColorStop(0, '#1a0d33');
    grad.addColorStop(1, '#0d0820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, CANVAS_W, 80);

    // Ground line glow
    ctx.strokeStyle = '#6a0dad';
    ctx.lineWidth   = 2;
    ctx.shadowColor = '#9b30ff';
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(CANVAS_W, groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawDragon(ctx) {
    const d    = this.dragon;
    const rage = d.rageMode;
    const cx   = d.x + d.w / 2;
    const cy   = d.y + d.h / 2;

    // Dragon particles (embers)
    d.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Glow aura
    const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 80);
    aura.addColorStop(0, rage ? 'rgba(255,60,0,0.3)' : 'rgba(180,0,255,0.2)');
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.fill();

    // Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, d.y + d.h + 5, 55, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Dragon body — drawn procedurally
    ctx.save();
    const breathe = Math.sin(this.frame * 0.08) * 3;

    // Tail
    ctx.strokeStyle = rage ? '#ff4400' : '#7b00cc';
    ctx.lineWidth   = 10;
    ctx.lineCap     = 'round';
    ctx.shadowColor = rage ? '#ff2200' : '#b000ff';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(d.x + d.w * 0.8, d.y + d.h * 0.6);
    ctx.quadraticCurveTo(d.x + d.w + 50, d.y + d.h * 0.8, d.x + d.w + 30, d.y + d.h + 20);
    ctx.stroke();

    // Body ellipse
    const bodyColor = rage ? '#8b0000' : '#4b0080';
    const bodyGrad  = ctx.createRadialGradient(cx - 10, cy - 10, 10, cx, cy, 60);
    bodyGrad.addColorStop(0, rage ? '#cc2200' : '#8800cc');
    bodyGrad.addColorStop(1, bodyColor);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + breathe, d.w / 2 - 5, d.h / 2 - 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rage ? '#ff2200' : '#cc00ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Wings
    const wingFlap = Math.sin(this.frame * 0.1) * 15;
    ctx.fillStyle   = rage ? 'rgba(180,20,0,0.7)' : 'rgba(80,0,160,0.7)';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 20);
    ctx.quadraticCurveTo(cx - 70, cy - 70 + wingFlap, cx - 100, cy - 30);
    ctx.quadraticCurveTo(cx - 60, cy - 20, cx - 10, cy - 20);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 20);
    ctx.quadraticCurveTo(cx + 50, cy - 70 - wingFlap, cx + 90, cy - 25);
    ctx.quadraticCurveTo(cx + 55, cy - 15, cx + 10, cy - 20);
    ctx.fill();

    // Head
    const headGrad = ctx.createRadialGradient(cx, d.y + 15, 5, cx, d.y + 25, 28);
    headGrad.addColorStop(0, rage ? '#ff4400' : '#aa00ff');
    headGrad.addColorStop(1, rage ? '#660000' : '#3d0070');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(cx, d.y + 22, 26, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rage ? '#ff2200' : '#cc00ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle   = rage ? '#ff6600' : '#ff00ff';
    ctx.shadowColor = rage ? '#ff4400' : '#ff00ff';
    ctx.shadowBlur  = 12;
    ctx.beginPath(); ctx.arc(cx - 10, d.y + 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 10, d.y + 18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx - 9, d.y + 17, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 11, d.y + 17, 2, 0, Math.PI * 2); ctx.fill();

    // Horns
    ctx.fillStyle = rage ? '#cc2200' : '#6600aa';
    ctx.beginPath();
    ctx.moveTo(cx - 12, d.y + 5);
    ctx.lineTo(cx - 20, d.y - 18);
    ctx.lineTo(cx - 6, d.y + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 12, d.y + 5);
    ctx.lineTo(cx + 20, d.y - 18);
    ctx.lineTo(cx + 6, d.y + 2);
    ctx.fill();

    ctx.restore();

    // Rage label
    if (rage) {
      ctx.save();
      ctx.font        = 'bold 13px "Cinzel", serif';
      ctx.fillStyle   = '#ff4400';
      ctx.shadowColor = '#ff2200';
      ctx.shadowBlur  = 8;
      ctx.fillText('⚡ RAGE MODE ⚡', d.x - 10, d.y - 10);
      ctx.restore();
    }
  }

  _drawPlayer(ctx) {
    const p  = this.player;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;

    // Invincibility flicker
    if (p.invincible > 0 && Math.floor(p.invincible / 5) % 2 === 0) return;

    // Shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, p.y + p.h + 3, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Player particles (slash trail)
    p.particles.forEach(pt => {
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle   = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Shield bubble
    if (p.shieldBlock > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,180,255,0.6)';
      ctx.lineWidth   = 3;
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur  = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Power-up glow
    if (p.atkBonusTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,200,0,0.5)';
      ctx.lineWidth   = 2;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    const flip = p.facing < 0;
    if (flip) {
      ctx.translate(cx * 2, 0);
      ctx.scale(-1, 1);
    }

    // Legs (animated)
    const legSwing = Math.sin(this.frame * 0.2) * 8;
    ctx.fillStyle = '#2a1a4e';
    ctx.fillRect(cx - 14, p.y + p.h - 22, 10, 22); // left leg static
    ctx.fillRect(cx + 4,  p.y + p.h - 22 + legSwing, 10, 22); // right leg animated

    // Body
    const bodyGrad = ctx.createLinearGradient(cx - 18, p.y + 20, cx + 18, p.y + 20);
    bodyGrad.addColorStop(0, p.hitFlash > 0 ? '#ff4444' : '#1a6b8a');
    bodyGrad.addColorStop(1, p.hitFlash > 0 ? '#cc0000' : '#0d3f5c');
    ctx.fillStyle = bodyGrad;
    // Rounded rect (manual, for max browser compat)
    const rx = cx - 18, ry = p.y + 22, rw = 36, rh = p.h - 40, rr = 8;
    ctx.beginPath();
    ctx.moveTo(rx + rr, ry);
    ctx.lineTo(rx + rw - rr, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
    ctx.lineTo(rx + rw, ry + rh - rr);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
    ctx.lineTo(rx + rr, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
    ctx.lineTo(rx, ry + rr);
    ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cape
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.moveTo(cx - 18, p.y + 24);
    ctx.quadraticCurveTo(cx - 28, p.y + 60, cx - 20, p.y + p.h - 24);
    ctx.lineTo(cx - 18, p.y + p.h - 24);
    ctx.closePath();
    ctx.fill();

    // Head
    const headGrad = ctx.createRadialGradient(cx, p.y + 14, 3, cx, p.y + 16, 16);
    headGrad.addColorStop(0, p.hitFlash > 0 ? '#ff8888' : '#f5cba7');
    headGrad.addColorStop(1, p.hitFlash > 0 ? '#cc4444' : '#c49a6c');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(cx, p.y + 16, 16, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = '#2a8fbf';
    ctx.beginPath();
    ctx.arc(cx, p.y + 8, 17, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#4ab8e0';
    ctx.fillRect(cx - 17, p.y + 6, 34, 6);
    ctx.beginPath();
    ctx.arc(cx, p.y + 6, 5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx + 7, p.y + 16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(cx + 8, p.y + 15, 1, 0, Math.PI * 2);
    ctx.fill();

    // Knife (shorter blade, dagger proportions)
    const knifeBob = Math.sin(this.frame * 0.1) * 3;
    ctx.save();
    // Knife glow when attacking
    if (p.attackTimer > p.attackCooldown - 10) {
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur  = 20;
    }
    // Blade (shorter & wider than sword)
    ctx.fillStyle = '#b0b8cc';
    ctx.fillRect(cx + 18, p.y + 26 + knifeBob, 6, 22);
    ctx.fillStyle = '#dde0e8';
    ctx.fillRect(cx + 19, p.y + 26 + knifeBob, 4, 20);
    // Blade tip
    ctx.beginPath();
    ctx.moveTo(cx + 18, p.y + 26 + knifeBob);
    ctx.lineTo(cx + 21, p.y + 18 + knifeBob);
    ctx.lineTo(cx + 24, p.y + 26 + knifeBob);
    ctx.fillStyle = '#ccd0dd';
    ctx.fill();
    // Guard (cross-guard, wider)
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(cx + 14, p.y + 48 + knifeBob, 16, 4);
    // Handle (shorter)
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(cx + 19, p.y + 52 + knifeBob, 5, 8);
    // Pommel
    ctx.fillStyle = '#7700cc';
    ctx.beginPath();
    ctx.arc(cx + 21.5, p.y + 62 + knifeBob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Block visual
    if (p.isBlocking) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0,180,255,0.7)';
      ctx.lineWidth   = 4;
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 42, 0, Math.PI * 2);
      ctx.stroke();
      // Inner shield icon
      ctx.font = '18px serif';
      ctx.fillStyle = 'rgba(0,200,255,0.8)';
      ctx.fillText('🛡️', cx - 10, p.y - 4);
      ctx.restore();
    }

    ctx.restore();
  }

  _drawProjectiles(ctx) {
    this.projectiles.forEach(p => {
      ctx.save();
      const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
      grad.addColorStop(0, p.isRage ? '#ffffff' : '#ffe066');
      grad.addColorStop(0.5, p.isRage ? '#ff4400' : '#ff8800');
      grad.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle   = grad;
      ctx.shadowColor = p.isRage ? '#ff2200' : '#ff8800';
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  _drawSlashes(ctx) {
    this.slashes.forEach(s => {
      const alpha = s.life / s.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth   = 4;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 15;
      // Arc slash
      ctx.beginPath();
      if (s.facing > 0) {
        ctx.arc(s.x, s.y + s.h / 2, s.w * 0.6, -Math.PI / 3, Math.PI / 3);
      } else {
        ctx.arc(s.x + s.w, s.y + s.h / 2, s.w * 0.6, Math.PI * (2/3), Math.PI * (4/3));
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  _drawMeteors(ctx) {
    this.meteors.forEach(m => {
      ctx.save();
      ctx.fillStyle   = '#ff8800';
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.strokeStyle = 'rgba(255,100,0,0.4)';
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + 10, m.y - 30);
      ctx.stroke();
      ctx.restore();
    });
  }

  _drawFog(ctx) {
    if (this.fogAlpha <= 0) return;
    const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    grad.addColorStop(0, `rgba(100,100,130,${this.fogAlpha})`);
    grad.addColorStop(1, `rgba(80,80,110,${this.fogAlpha * 0.7})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  _drawFieldItems(ctx) {
    this.fieldItems.forEach(it => {
      ctx.save();
      // Glow
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur  = 15;
      // Pedestal
      ctx.fillStyle = 'rgba(0,200,150,0.15)';
      ctx.beginPath();
      ctx.ellipse(it.x + it.w / 2, it.y + it.h + 4, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Icon
      ctx.font      = '28px serif';
      ctx.shadowBlur = 12;
      ctx.fillText(it.icon, it.x, it.y + it.h + it.bob);
      ctx.restore();
    });
  }

  _drawParticles(ctx) {
    // Dragon particles already drawn inside _drawDragon
    // Player particles already drawn inside _drawPlayer
  }

  _drawFloatingTexts(ctx) {
    this.floatingTexts.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.life / t.maxLife;
      ctx.font        = 'bold 16px "Cinzel", serif';
      ctx.fillStyle   = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur  = 8;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }

  // ─── Main Loop ────────────────────────────────────────────────

  run() {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
