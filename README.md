# 3D Fireboy and Watergirl

A cooperative 3D platformer game built with Three.js, where two players must work together to guide Fireboy and Watergirl through challenging levels to reach their matching doors simultaneously. This was inspired by a childhood game I played as a child with my twin sister. It's educational since it fosters cooperation between two individuals. Lord knows how many fights I had with my sister over the original game. 

## Live 

**Play the game now:** [https://fireboywatergirl.vercel.app/](https://fireboywatergirl.vercel.app/)

The game is currently deployed on Vercel and is actively being developed with more levels coming soon!

> **⚠️ DEVELOPER NOTE:** A dev camera mode has been included! Press **C** during gameplay to toggle the developer camera, which allows free camera movement for testing and level design purposes.

## About the Game

This is a 3D adaptation of the classic Fireboy and Watergirl puzzle-platformer game. Players control two characters with different abilities who must cooperate to solve puzzles and navigate through dangerous environments filled with lava, water, acid, moving platforms, buttons, and more.

### Game Features

- **Cooperative Gameplay**: Two players work together to solve puzzles
- **3D Graphics**: Built with Three.js for 3D gameplay
- **Multiple Hazards**: Lava, water, and green acid with different effects on each character
- **Interactive Elements**: 
  - Pressure plates that activate doors and mechanisms
  - Movable boxes that can be pushed and carried (carrying objects is not in the original inspired game, I added this ^_^)
  - Levers that control moving platforms
  - Collectible gems
- **Tutorial Level**: Level 1 includes helpful tutorial text to guide new players
- **Progressive Difficulty**: More levels with increasing complexity (coming soon!)

## How to Play

### Controls

**Fireboy (Red Character):**
- **W** - Move Up
- **A** - Move Left
- **S** - Move Down
- **D** - Move Right
- **E** - Pick up/Drop Box

**Watergirl (Blue Character):**
- **↑** - Move Up
- **←** - Move Left
- **↓** - Move Down
- **→** - Move Right
- **Space** - Pick up/Drop Box

**Developer Controls:**
- **C** - Toggle Developer Camera (free camera movement for testing/level design)

### Game Mechanics

- **Lava**: Fireboy is immune, but Watergirl will die instantly if she touches it
- **Water**: Watergirl is immune, but Fireboy will die instantly if he touches it
- **Green Acid**: Lethal to both characters - avoid at all costs!
- **Pressure Plates**: Stand on yellow buttons to activate doors or mechanisms
- **Boxes**: Push or carry brown boxes to hold down buttons or create platforms
- **Levers**: Activate orange levers to control moving platforms
- **Gems**: Collect red gems (Fireboy) and blue gems (Watergirl) for bonus points (full stars)
- **Goal**: Both characters must reach their matching colored doors at the same time to complete the level

## Installation & Setup

### Prerequisites

- **Node.js** (v14 or higher recommended)
- **npm** (comes with Node.js)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/arb-afk/final_ite18.git (publicly available)
   cd final_ite18
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - The development server will start on `http://localhost:5173` (or another port if 5173 is busy)
   - Open the URL shown in your terminal in a web browser

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## Technology Stack

- **Three.js** - 3D graphics and rendering
- **Vite** - Build tool and development server
- **JavaScript (ES6+)** - Game logic and mechanics
- **CSS3** - UI styling and animations

## Project Structure

```
Platformer/
├── public/
│   └── assets/          # Static assets (images, audio)
├── src/
│   ├── levels/         # Level definitions
│   ├── Audio.js        # Audio management
│   ├── CameraControl.js # Camera system
│   ├── LevelManager.js  # Level loading and management
│   ├── Physics.js       # Physics engine
│   ├── TutorialText.js  # Tutorial text system
│   ├── VisualEffects.js # Visual effects
│   └── main.js          # Main game logic
├── index.html           # Entry point
├── style.css            # Styles
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies
```

## Development Status

This project is **actively under development**. Current features:

- Tutorial level with helpful hints
- Multiple interactive game elements
- Physics-based movement and collisions
- Audio system with background music (may take some time to load since the audio file is an hour long)
- Level completion system
- Game over and restart functionality

**Coming Soon:** (I consider this a passion project and will continue working on it)
- More levels with increasing difficulty
- Additional game mechanics
- Enhanced visual effects
- More collectibles and challenges

## Contributing

This is a personal AND academic project, but suggestions and feedback are welcome!

## License

This project is created for educational purposes (ITE 18).

## Links

- **Live Game**: [https://fireboywatergirl.vercel.app/](https://fireboywatergirl.vercel.app/)
- **GitHub Repository**: [https://github.com/arb-afk/final_ite18](https://github.com/arb-afk/final_ite18)

## Tips for Players

1. **Communication is Key**: Work together with your partner to coordinate movements
2. **Plan Ahead**: Look at the level layout before starting to plan your route
3. **Use Boxes Wisely**: Boxes can be used to hold down buttons or create stepping stones
4. **Timing Matters**: Some puzzles require precise timing, especially with moving platforms
5. **Practice**: The tutorial level is there to help you learn the mechanics!

---

**Enjoy the game and have fun!**

