# 🐉 Dragon Slayer

An interactive JavaScript game featuring an **adaptive AI dragon** powered by a hand-crafted neural network (MLP). Battle a dragon that learns and predicts your movement patterns in real-time!


---

## 🎮 Features

- **Adaptive AI Dragon**: Uses a custom Multi-Layer Perceptron (MLP) neural network that learns your movement patterns
- **Real-Time Prediction**: The dragon predicts your next move and adapts its behavior dynamically
- **Dynamic Gameplay**: The more you play, the smarter the dragon becomes
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Pure JavaScript**: Built entirely with vanilla JavaScript—no frameworks required

---

## 🛠️ Tech Stack

- **JavaScript** (78.4%) - Game logic and AI implementation
- **CSS** (20.8%) - Styling and animations
- **HTML** (0.8%) - Markup structure

---

## 📁 Project Structure

```
dragon-slayer/
├── index.html          # Main HTML entry point
├── js/                 # JavaScript modules
│   ├── mlp.js         # Multi-Layer Perceptron (MLP) neural network
│   ├── dragon.js      # Dragon AI logic and behavior
│   ├── ui.js          # User interface components
│   ├── game.js        # Game loop and mechanics
│   └── app.js         # Application initialization
├── css/               # Stylesheets
│   └── style.css      # Main styles
└── images/            # Game assets (sprites, backgrounds, etc.)
```

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- No installation or build tools required

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ooiyicheng0808-eng/dragon-slayer.git
   cd dragon-slayer
   ```

2. **Open in browser**
   - Simply open `index.html` in your web browser, or
   - Serve locally using a simple HTTP server:
     ```bash
     python -m http.server 8000
     # or
     npx serve
     ```

3. **Play!**
   - Navigate to `http://localhost:8000` and start battling the dragon

---

## 🧠 How the AI Works

The dragon uses a **Multi-Layer Perceptron (MLP)** neural network to:

1. **Observe** your movement patterns and game state
2. **Learn** from your behavior during gameplay
3. **Predict** your next moves
4. **Adapt** its attack patterns to counter your strategy

The MLP is implemented from scratch in `js/mlp.js` without external ML libraries, making it lightweight and efficient.

---

## 🎯 How to Play

- **Move**: Use arrow keys or mouse to control your character
- **Attack**: Click or press space to attack the dragon
- **Survive**: Avoid the dragon's adaptive attacks
- **Score**: Rack up points by successfully hitting the dragon
- **Challenge**: The dragon gets smarter as you play—can you beat it?

---

## 📊 Repository Stats

- **Primary Language**: JavaScript (78.4%)
- **Repository Created**: June 4, 2026
- **Status**: Active Development

---



## 📝 License

This project is licensed under the [ISC License](LICENSE).

---


## 💡 Future Enhancements

- [ ] Multiple difficulty levels
- [ ] High score leaderboard
- [ ] Additional dragon types with different AI behaviors
- [ ] Power-ups and special abilities
- [ ] Sound effects and music
- [ ] Multiplayer mode

---


**"May your sword be sharp and your predictions sharper!"** ⚔️🐉
