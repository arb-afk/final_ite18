import * as THREE from 'three';
import { PhysicsWorld } from './Physics.js';
import { LevelManager } from './LevelManager.js';
import { AudioManager } from './Audio.js';
import { CameraManager } from './CameraControl.js';
import { TutorialTextManager } from './TutorialText.js';

// --- State ---
const state = {
  currentLevel: 0,
  isPlaying: false,
  isGameOver: false,
  fireOnGoal: false,
  waterOnGoal: false,
  isLevelComplete: false,
  inMenu: true,
  maxLevel: 0,
  gems: { fire: 0, water: 0 },
  maxGems: { fire: 0, water: 0 },
  levelStartTime: 0,
  levelTime: 0,
  stars: 0,
  levelStars: [] // Array to store star ratings for each level
};

const audio = new AudioManager();

// --- Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202025);
scene.fog = new THREE.Fog(0x202025, 30, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
let accumulator = 0;
const TIMESTEP = 1 / 60; // Fixed 60 FPS physics step

// --- Camera ---
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 8, 30);
camera.lookAt(0, 2, 0);

const camMgr = new CameraManager(camera, renderer.domElement);

// --- Lights ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// --- Modules ---
const physics = new PhysicsWorld(scene);
const levelMgr = new LevelManager(scene, physics);
const tutorialText = new TutorialTextManager(scene, camera, renderer);

// --- Progress System ---
function loadProgress() {
  const saved = localStorage.getItem('elemental_level');
  state.maxLevel = saved ? parseInt(saved) : 0;
  
  const savedStars = localStorage.getItem('elemental_stars');
  state.levelStars = savedStars ? JSON.parse(savedStars) : [];
  
  updateMenu();
}

function saveProgress(levelIndex) {
  if (levelIndex > state.maxLevel) {
    state.maxLevel = levelIndex;
    localStorage.setItem('elemental_level', state.maxLevel);
  }
  
  // Save star rating for current level
  if (!state.levelStars[state.currentLevel] || state.stars > state.levelStars[state.currentLevel]) {
    state.levelStars[state.currentLevel] = state.stars;
    localStorage.setItem('elemental_stars', JSON.stringify(state.levelStars));
  }
  
  updateMenu();
}

// --- Characters ---
function createCharacter(colorHex) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.2 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), material);
  body.position.y = -0.2;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), material);
  head.position.y = 0.4;
  head.castShadow = true;
  group.add(head);

  const eyeGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.1, 0.4, 0.2);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.1, 0.4, 0.2);
  group.add(eyeL, eyeR);

  scene.add(group);

  return {
    mesh: group,
    velocity: new THREE.Vector3(),
    isGrounded: false,
    width: 0.6,
    height: 1.2,
    element: colorHex === 0xff4444 ? 'fire' : 'water',
    carryingBox: null,
    lastPickup: false,
    lastDirection: 1,
    jumpSoundCooldown: 0  // Prevent rapid jump sound triggers
  };
}

const playerFire = createCharacter(0xff4444);
const playerWater = createCharacter(0x4488ff);

// --- UI & Controls ---
const ui = {
  menu: document.getElementById('main-menu'),
  hud: document.getElementById('hud'),
  msg: document.getElementById('game-message'),
  btnStart: document.getElementById('btn-start'),
  btnRestart: document.getElementById('btn-restart'),
  levelSelect: document.getElementById('level-select')
};

// Helper to rebuild menu
function updateMenu() {
  if (!ui.levelSelect) return; // Guard
  ui.levelSelect.innerHTML = '';
  const totalLevels = levelMgr.getLevels().length;
  
  for (let i = 0; i < totalLevels; i++) {
    const btnContainer = document.createElement('div');
    btnContainer.className = 'level-btn-container';
    
    const btn = document.createElement('button');
    btn.innerText = `Level ${i + 1}`;
    btn.className = 'level-btn';
    
    // Add stars display
    const starsDiv = document.createElement('div');
    starsDiv.className = 'level-stars';
    const levelStars = state.levelStars[i] || 0;
    for (let s = 0; s < 3; s++) {
      const star = document.createElement('span');
      star.textContent = s < levelStars ? '⭐' : '☆';
      star.style.opacity = s < levelStars ? '1' : '0.3';
      starsDiv.appendChild(star);
    }
    
    if (i > state.maxLevel) {
      btn.disabled = true;
      btn.style.opacity = 0.5;
      btn.innerText = `Level ${i + 1} (Locked)`;
    } else {
      btn.onclick = () => {
        audio.playLevelSelect();
        ui.menu.classList.add('hidden');
        ui.hud.classList.remove('hidden');
        state.inMenu = false;
        startGame(i);
      };
    }
    
    btnContainer.appendChild(btn);
    btnContainer.appendChild(starsDiv);
    ui.levelSelect.appendChild(btnContainer);
  }
}

ui.btnStart.onclick = () => {
  audio.playLevelSelect();
  ui.menu.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  state.inMenu = false;
  // Start highest available level
  startGame(state.maxLevel >= levelMgr.getLevels().length ? 0 : state.maxLevel);
};

ui.btnRestart.addEventListener('click', () => {
  if (!state.inMenu) restartLevel();
});

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (!state.inMenu) {
    if (state.isGameOver || (!state.isPlaying && state.fireOnGoal && state.waterOnGoal)) {
      if (e.code === 'KeyR') restartLevel();
      if (e.code === 'KeyN') nextLevel();
    }
    if (e.code === 'Escape') {
      state.inMenu = true;
      state.isPlaying = false;
      audio.stopMusic();
      ui.menu.classList.remove('hidden');
      ui.hud.classList.add('hidden');
      hideMsg();
      updateMenu();
    }
    if (e.code === 'KeyC') {
        camMgr.toggle();
    }
  }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// --- Game Logic ---
async function startGame(levelIndex) {
  await audio.resume();
  await audio.startMusic();

  state.currentLevel = levelIndex;
  const startPos = levelMgr.loadLevel(levelIndex);
  
  if (!startPos) {
    state.currentLevel = 0;
    startGame(0);
    return;
  }

  // Count total gems in level
  const levelData = levelMgr.levels[levelIndex];
  state.maxGems.fire = levelData.gems ? levelData.gems.filter(g => g.type === 'gem_fire').length : 0;
  state.maxGems.water = levelData.gems ? levelData.gems.filter(g => g.type === 'gem_water').length : 0;

  resetPlayer(playerFire, startPos.fire);
  resetPlayer(playerWater, startPos.water);

  state.inMenu = false;
  state.isPlaying = true;
  state.isGameOver = false;
  state.fireOnGoal = false;
  state.waterOnGoal = false;
  state.isLevelComplete = false;
  state.gems.fire = 0;
  state.gems.water = 0;
  state.levelStartTime = Date.now();
  state.levelTime = 0;
  
  initializeGemDisplay();
  updateHUD();
  hideMsg();
  // Clear stars display when starting a new level
  document.getElementById('stars-display').innerHTML = '';
  
  ui.menu.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  
  // Reset accumulator to prevent catch-up jumps on start
  accumulator = 0;
  clock.getDelta(); // clear clock
  
  // Setup tutorial text for level 1
  if (levelIndex === 0) {
    tutorialText.setupLevel1(playerFire, playerWater, physics);
  } else {
    tutorialText.clear();
  }
}

function updateHUD() {
  // Update gem displays
  updateGemDisplay('fire', state.gems.fire);
  updateGemDisplay('water', state.gems.water);
  
  // Update timer
  if (state.isPlaying && !state.isLevelComplete) {
    state.levelTime = Math.floor((Date.now() - state.levelStartTime) / 1000);
  }
  const minutes = Math.floor(state.levelTime / 60);
  const seconds = state.levelTime % 60;
  document.getElementById('timer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function initializeGemDisplay() {
  const fireContainer = document.getElementById('fire-gems');
  const waterContainer = document.getElementById('water-gems');
  
  fireContainer.innerHTML = '';
  waterContainer.innerHTML = '';
  
  // Create fire gem icons
  for (let i = 0; i < state.maxGems.fire; i++) {
    const img = document.createElement('img');
    img.src = '/assets/red gem.png';
    img.className = 'gem-icon';
    img.dataset.index = i;
    fireContainer.appendChild(img);
  }
  
  // Create water gem icons
  for (let i = 0; i < state.maxGems.water; i++) {
    const img = document.createElement('img');
    img.src = '/assets/blue gem.png';
    img.className = 'gem-icon';
    img.dataset.index = i;
    waterContainer.appendChild(img);
  }
}

function updateGemDisplay(type, count) {
  const container = document.getElementById(type === 'fire' ? 'fire-gems' : 'water-gems');
  const icons = container.querySelectorAll('.gem-icon');
  
  icons.forEach((icon, index) => {
    if (index < count) {
      icon.classList.add('collected');
    } else {
      icon.classList.remove('collected');
    }
  });
}

function calculateStars() {
  const totalGems = state.gems.fire + state.gems.water;
  const maxTotalGems = state.maxGems.fire + state.maxGems.water;
  const gemsPercent = maxTotalGems > 0 ? totalGems / maxTotalGems : 1;
  
  // Time thresholds (can be adjusted per level)
  const goldTime = 30; // Under 30s = perfect time
  const silverTime = 60; // Under 60s = good time
  
  let stars = 0;
  
  // Star 1: Complete the level
  stars++;
  
  // Star 2: Collect all gems
  if (gemsPercent >= 1.0) stars++;
  
  // Star 3: Complete within time limit
  if (state.levelTime <= goldTime) {
    stars++;
  } else if (state.levelTime <= silverTime && gemsPercent >= 1.0) {
    stars++;
  }
  
  return Math.min(stars, 3);
}

function displayStars(stars) {
  const container = document.getElementById('stars-display');
  container.innerHTML = '';
  
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.textContent = i < stars ? '⭐' : '☆';
    star.style.opacity = i < stars ? '1' : '0.3';
    container.appendChild(star);
  }
}

function resetPlayer(p, pos) {
  p.mesh.position.set(pos[0], pos[1], 0); 
  p.velocity.set(0, 0, 0);
  p.ridingPlatform = null;
}

function updatePlayerVisuals(player) {
  // Squash player slightly when carrying heavy box
  const targetScaleY = player.carryingBox ? 0.9 : 1.0;
  const targetScaleX = player.carryingBox ? 1.05 : 1.0;
  
  // Smooth transition
  player.mesh.scale.y += (targetScaleY - player.mesh.scale.y) * 0.1;
  player.mesh.scale.x += (targetScaleX - player.mesh.scale.x) * 0.1;
  player.mesh.scale.z = player.mesh.scale.x;
}

function restartLevel() {
  startGame(state.currentLevel);
}

function nextLevel() {
  const nextIdx = state.currentLevel + 1;
  saveProgress(nextIdx); 
  startGame(nextIdx);
}

function showMsg(title, sub) {
  document.getElementById('msg-title').innerText = title;
  document.getElementById('msg-sub').innerText = sub;
  ui.msg.classList.remove('hidden');
}

function hideMsg() {
  ui.msg.classList.add('hidden');
}

function checkGoals() {
  if (state.fireOnGoal && state.waterOnGoal && !state.isLevelComplete) {
    state.isLevelComplete = true;
    state.isPlaying = false;
    
    // Calculate stars
    state.stars = calculateStars();
    
    audio.playGoal();
    showMsg("LEVEL COMPLETE", "Press N for Next Level");
    displayStars(state.stars);
    
    saveProgress(state.currentLevel + 1); 
  }
}

function update() {
  requestAnimationFrame(update);
  
  const delta = Math.min(clock.getDelta(), 0.1); // Cap to 100ms
  
  if (state.inMenu) {
    const t = Date.now() * 0.0005;
    camera.position.x = Math.sin(t) * 20;
    camera.position.z = Math.cos(t) * 20 + 20;
    camera.lookAt(0, 5, 0);
    renderer.render(scene, camera);
    return;
  }

  if (!state.isPlaying && !state.isGameOver && !(state.fireOnGoal && state.waterOnGoal)) {
     renderer.render(scene, camera);
     return;
  }

  if (state.isPlaying) {
    // Update timer
    updateHUD();
    
    // Fixed Timestep Loop
    accumulator += delta;
    
    while (accumulator >= TIMESTEP) {
      stepPhysics();
      accumulator -= TIMESTEP;
    }
  }

  // Update Visual Effects
  if (levelMgr.vfx) levelMgr.vfx.update(Date.now());

  // Rotate gems
  levelMgr.activeObjects.forEach(obj => {
    if (obj.userData.isGem) {
      obj.rotation.y += obj.userData.rotationSpeed;
    }
  });

  // Visual feedback for carrying boxes (player squashes down slightly)
  updatePlayerVisuals(playerFire);
  updatePlayerVisuals(playerWater);

  // Update tutorial text
  if (state.currentLevel === 0 && state.isPlaying) {
    tutorialText.update(playerFire, playerWater, physics);
  }

  // Camera Follow
  if (camMgr.active) {
      camMgr.update();
  } else {
      const midX = (playerFire.mesh.position.x + playerWater.mesh.position.x) / 2;
      const midY = (playerFire.mesh.position.y + playerWater.mesh.position.y) / 2;
      
      const targetX = midX;
      const targetY = Math.max(0, midY + 4);

      camera.position.x += (targetX - camera.position.x) * 0.1;
      camera.position.y += (targetY - camera.position.y) * 0.1;
      camera.position.z = 30; 
      camera.lookAt(camera.position.x, camera.position.y - 2, 0);
  }

  renderer.render(scene, camera);
}

function stepPhysics() {
    const onEvent = (e) => {
      if (e === 'jump') audio.playJump();
      if (e === 'button') audio.playButton();
    };

    // Update platforms FIRST so players can use current velocity
    physics.updateSystems([playerFire, playerWater], onEvent);
    physics.updatePlatforms();
    
    // Explicitly sync players to platforms to prevent falling off
    physics.syncPlayersToPlatforms([playerFire, playerWater]);

    const resFire = physics.update(playerFire, {
      left: keys['KeyA'], right: keys['KeyD'], up: keys['KeyW'], pickup: keys['KeyE']
    }, onEvent);

    const resWater = physics.update(playerWater, {
      left: keys['ArrowLeft'], right: keys['ArrowRight'], up: keys['ArrowUp'], pickup: keys['Space']
    }, onEvent);

    if (resFire === 'gem_fire') { state.gems.fire++; updateHUD(); audio.playButton(); }
    if (resWater === 'gem_water') { state.gems.water++; updateHUD(); audio.playButton(); }

    // Hazard Check
    if (resFire === 'dead' || resWater === 'dead' || 
        (resFire === 'water' && !state.isGameOver) || 
        (resWater === 'lava' && !state.isGameOver) || 
        resFire === 'acid' || resWater === 'acid') {
      if (!state.isGameOver) audio.playDeath();
      state.isPlaying = false;
      state.isGameOver = true;
      // Clear stars display on game over
      document.getElementById('stars-display').innerHTML = '';
      showMsg("GAME OVER", "Press R to Restart");
    }

    // Update goal states - once achieved, keep them true until level change
    if (resFire === 'goal_fire' && !state.fireOnGoal) {
       state.fireOnGoal = true;
       audio.playButton(); 
    }
    if (resWater === 'goal_water' && !state.waterOnGoal) {
       state.waterOnGoal = true;
       audio.playButton();
    }

    checkGoals();
}

// Init
loadProgress();
levelMgr.loadLevel(0); 

// Start music on any user interaction (required by browsers)
let musicStarted = false;
async function startMusicOnInteraction() {
  if (!musicStarted) {
    musicStarted = true;
    console.log('User interaction detected, starting music...');
    await audio.resume();
    // Start music (it will wait for buffer if needed)
    await audio.startMusic();
    // Remove listeners after first interaction
    document.removeEventListener('click', startMusicOnInteraction);
    document.removeEventListener('keydown', startMusicOnInteraction);
  }
}
document.addEventListener('click', startMusicOnInteraction);
document.addEventListener('keydown', startMusicOnInteraction);

update();
