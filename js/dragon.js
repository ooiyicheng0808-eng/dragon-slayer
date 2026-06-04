/**
 * dragon.js — Dragon AI using the MLP to predict player moves
 * Dragon Slayer — JavaScript Game Assignment
 *
 * The dragon observes the last N player moves, encodes them as MLP input,
 * trains the network after each move, and uses predictions to decide
 * its counter-attack position and special abilities.
 *
 * Move encoding:  0=LEFT  1=RIGHT  2=UP  3=DOWN  4=NONE
 */

"use strict";

const MOVE = { LEFT: 0, RIGHT: 1, UP: 2, DOWN: 3, NONE: 4 };
const MOVE_NAMES = ["Left", "Right", "Up", "Down", "None"];

class DragonAI {
  constructor(mlp) {
    this.mlp = mlp;

    this.HISTORY_LEN  = 3;   // how many past moves to feed the MLP
    this.NUM_MOVES    = 5;   // LEFT RIGHT UP DOWN NONE
    this.moveHistory  = [];  // raw move indices, newest last

    // Dragon stats
    this.maxHp     = 300;
    this.hp        = 300;
    this.baseAtk   = 20;
    this.atk       = 20;
    this.defense   = 5;
    this.speed     = 1.2;
    this.level     = 1;

    // Position on canvas (set by game)
    this.x    = 600;
    this.y    = 250;
    this.w    = 140;
    this.h    = 140;

    // Aiming: where the dragon thinks the player will be
    this.aimedAt  = MOVE.NONE;
    this.fireDelay = 0;       // cooldown frames before next breath
    this.fireRate  = 90;      // frames between attacks
    this.breathing = false;   // is currently shooting
    this.breathDir = null;    // direction of breath

    // Rage mode
    this.rageMode     = false;
    this.rageThreshold = 0.3; // HP fraction below which dragon rages

    // Particles for effects
    this.particles = [];

    // Prediction confidence visible to HUD
    this.prediction     = MOVE.NONE;
    this.confidence     = 0;
    this.allProbs       = Array(5).fill(0.2);
  }

  /** Encode the move history as a flat one-hot vector (MLP input). */
  _encodeHistory() {
    const input = [];
    for (let i = 0; i < this.HISTORY_LEN; i++) {
      const one_hot = Array(this.NUM_MOVES).fill(0);
      const idx = this.moveHistory.length > i
        ? this.moveHistory[this.moveHistory.length - 1 - i]
        : MOVE.NONE;
      one_hot[idx] = 1;
      input.push(...one_hot);
    }
    return input; // length = 15
  }

  /**
   * Called every time the player makes a move.
   * Trains the MLP and updates the dragon's prediction.
   * @param {number} moveIdx  One of MOVE.*
   */
  recordPlayerMove(moveIdx) {
    if (this.moveHistory.length > 0) {
      // The *previous* call predicted the current move — train on it
      const input  = this._encodeHistory();
      this.mlp.train(input, moveIdx);
    }

    // Append current move to history (keep last HISTORY_LEN entries)
    this.moveHistory.push(moveIdx);
    if (this.moveHistory.length > this.HISTORY_LEN + 1) {
      this.moveHistory.shift();
    }

    // Now predict NEXT move
    const input = this._encodeHistory();
    this.allProbs   = this.mlp.probabilities(input);
    this.prediction = this.allProbs.indexOf(Math.max(...this.allProbs));
    this.confidence = Math.max(...this.allProbs);
  }

  /** Scale up dragon for a new level. */
  scaleToLevel(level) {
    this.level   = level;
    this.maxHp   = 300 + (level - 1) * 100;
    this.hp      = this.maxHp;
    this.atk     = 20  + (level - 1) * 8;
    this.defense = 5   + (level - 1) * 2;
    this.speed   = 1.2 + (level - 1) * 0.15;
    this.fireRate = Math.max(40, 90 - (level - 1) * 12);
    this.rageMode = false;
  }

  /** Update dragon logic each frame. */
  update(player, dt) {
    // Check rage mode
    if (!this.rageMode && this.hp / this.maxHp < this.rageThreshold) {
      this.rageMode = true;
      this.atk     *= 1.5;
      this.fireRate  = Math.max(20, this.fireRate - 15);
    }

    // Fire breath cooldown
    if (this.fireDelay > 0) {
      this.fireDelay -= dt;
    }

    // Update particles
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
    });

    return null; // no projectile this frame
  }

  /**
   * Attempt to fire a breath attack.
   * Returns a Projectile object if successful, else null.
   */
  tryFire(playerX, playerY) {
    if (this.fireDelay > 0) return null;

    this.fireDelay = this.fireRate;

    // The dragon aims at the predicted position, not the actual position
    const predicted = this.prediction;
    let targetX = playerX;
    let targetY = playerY;
    const lead = 60; // pixel offset to lead the prediction

    if (predicted === MOVE.LEFT)  targetX -= lead;
    if (predicted === MOVE.RIGHT) targetX += lead;
    if (predicted === MOVE.UP)    targetY -= lead;
    if (predicted === MOVE.DOWN)  targetY += lead;

    // Spawn fire particles for visual effect
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x:      this.x + this.w / 2,
        y:      this.y + this.h / 2,
        vx:     (Math.random() - 0.5) * 3,
        vy:     (Math.random() - 0.5) * 3,
        life:   0.6,
        maxLife: 0.6,
        alpha:  1,
        color:  this.rageMode ? '#ff4400' : '#ff8800',
        size:   Math.random() * 8 + 4,
      });
    }

    return {
      x:  this.x + this.w / 2,
      y:  this.y + this.h / 2,
      tx: targetX,
      ty: targetY,
      speed: 5 + this.level * 0.5,
      dmg: this.atk,
      predicted: MOVE_NAMES[predicted],
      isRage: this.rageMode,
      r: 14,
    };
  }

  takeDamage(amount) {
    const effective = Math.max(1, amount - this.defense);
    this.hp = Math.max(0, this.hp - effective);
    // Hit flash particles
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x:      this.x + Math.random() * this.w,
        y:      this.y + Math.random() * this.h,
        vx:     (Math.random() - 0.5) * 4,
        vy:     (Math.random() - 0.5) * 4,
        life:   0.4,
        maxLife: 0.4,
        alpha:  1,
        color:  '#ff0000',
        size:   Math.random() * 6 + 3,
      });
    }
    return effective;
  }

  get isDead() { return this.hp <= 0; }
  get hpFraction() { return this.hp / this.maxHp; }
}
