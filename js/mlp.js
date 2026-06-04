/**
 * mlp.js — Multilayer Perceptron (MLP) from scratch (no libraries)
 * Dragon Slayer Assignment — JavaScript Implementation
 *
 * Architecture:
 *   Input  : 15 neurons  (last 3 moves, each one-hot encoded over 5 classes)
 *   Hidden1: 12 neurons  (ReLU)
 *   Hidden2:  8 neurons  (ReLU)
 *   Output :  5 neurons  (Softmax → predicted player move)
 *
 * Training: Online backpropagation after every player action.
 */

"use strict";

class MLP {
  /**
   * @param {number[]} layers  Array of layer sizes e.g. [15, 12, 8, 5]
   * @param {number}   lr      Learning rate
   */
  constructor(layers = [15, 12, 8, 5], lr = 0.05) {
    this.layers = layers;
    this.lr = lr;
    this.weights = [];  // weights[i] : matrix [layers[i+1]][layers[i]]
    this.biases  = [];  // biases[i]  : vector [layers[i+1]]

    // Xavier/Glorot initialisation for better convergence
    for (let i = 0; i < layers.length - 1; i++) {
      const fan_in  = layers[i];
      const fan_out = layers[i + 1];
      const limit   = Math.sqrt(6 / (fan_in + fan_out));
      this.weights.push(
        Array.from({ length: fan_out }, () =>
          Array.from({ length: fan_in }, () => MLP._rand(-limit, limit))
        )
      );
      this.biases.push(Array(fan_out).fill(0));
    }

    // Training statistics exposed for the UI
    this.totalTrainSteps = 0;
    this.lastLoss        = 0;
    this.accuracy        = 0;
    this._correctCount   = 0;
  }

  // ─── Utility ────────────────────────────────────────────────────────────────

  static _rand(lo, hi) {
    return Math.random() * (hi - lo) + lo;
  }

  /** ReLU activation */
  static _relu(x) { return x > 0 ? x : 0; }

  /** ReLU derivative */
  static _reluD(x) { return x > 0 ? 1 : 0; }

  /** Numerically stable softmax */
  static _softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(v => Math.exp(v - max));
    const sum  = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  // ─── Forward Pass ───────────────────────────────────────────────────────────

  /**
   * Run input through the network.
   * Returns { activations, zs } where activations[0] = input, zs[i] = pre-activation.
   */
  forward(input) {
    const activations = [input.slice()];
    const zs = [];

    for (let i = 0; i < this.weights.length; i++) {
      const W = this.weights[i];
      const b = this.biases[i];
      const prev = activations[activations.length - 1];
      const z = W.map((row, ri) =>
        row.reduce((sum, w, ci) => sum + w * prev[ci], 0) + b[ri]
      );
      zs.push(z);

      // Last layer: softmax; hidden layers: ReLU
      const isLast = i === this.weights.length - 1;
      activations.push(isLast ? MLP._softmax(z) : z.map(MLP._relu));
    }

    return { activations, zs };
  }

  /**
   * Predict: returns index of the most probable class.
   */
  predict(input) {
    const { activations } = this.forward(input);
    const out = activations[activations.length - 1];
    return out.indexOf(Math.max(...out));
  }

  /**
   * Get full probability distribution over moves.
   */
  probabilities(input) {
    const { activations } = this.forward(input);
    return activations[activations.length - 1];
  }

  // ─── Backpropagation ────────────────────────────────────────────────────────

  /**
   * Train on a single (input, targetClass) pair.
   * Uses cross-entropy loss with softmax output.
   */
  train(input, targetClass) {
    const { activations, zs } = this.forward(input);
    const numLayers = this.layers.length - 1;
    const predicted = activations[numLayers].indexOf(
      Math.max(...activations[numLayers])
    );

    // Cross-entropy loss
    const probTarget = Math.max(activations[numLayers][targetClass], 1e-9);
    this.lastLoss = -Math.log(probTarget);

    // Accuracy rolling estimate (last 50 steps)
    this._correctCount = (this._correctCount || 0) + (predicted === targetClass ? 1 : 0);
    this.totalTrainSteps++;
    if (this.totalTrainSteps % 10 === 0) {
      this.accuracy = this._correctCount / 10;
      this._correctCount = 0;
    }

    // Compute output delta (softmax + cross-entropy combined gradient)
    const deltas = [];
    const outDelta = activations[numLayers].slice();
    outDelta[targetClass] -= 1; // softmax-CE gradient shortcut
    deltas[numLayers - 1] = outDelta;

    // Backprop through hidden layers
    for (let i = numLayers - 2; i >= 0; i--) {
      const W_next   = this.weights[i + 1];
      const delta_next = deltas[i + 1];
      const z = zs[i];

      deltas[i] = z.map((zv, j) => {
        // Sum of W_next[:, j] * delta_next[:]
        const grad = W_next.reduce((s, row, ri) => s + row[j] * delta_next[ri], 0);
        return grad * MLP._reluD(zv);
      });
    }

    // Update weights & biases
    for (let i = 0; i < numLayers; i++) {
      const delta = deltas[i];
      const act   = activations[i];

      this.weights[i] = this.weights[i].map((row, ri) =>
        row.map((w, ci) => w - this.lr * delta[ri] * act[ci])
      );
      this.biases[i] = this.biases[i].map((b, ri) => b - this.lr * delta[ri]);
    }
  }

  // ─── Persistence ────────────────────────────────────────────────────────────

  /** Serialise to plain object for localStorage */
  serialise() {
    return {
      layers:          this.layers,
      lr:              this.lr,
      weights:         this.weights,
      biases:          this.biases,
      totalTrainSteps: this.totalTrainSteps,
      accuracy:        this.accuracy,
    };
  }

  /** Restore from plain object */
  static deserialise(obj) {
    const net = new MLP(obj.layers, obj.lr);
    net.weights         = obj.weights;
    net.biases          = obj.biases;
    net.totalTrainSteps = obj.totalTrainSteps || 0;
    net.accuracy        = obj.accuracy        || 0;
    return net;
  }
}
