import * as THREE from 'three';

// --- Configuration ---
const SCENE_BG = 0x222222;
const GRAVITY = 0.015;
const MOVE_SPEED = 0.15;
const JUMP_FORCE = 0.35;

// --- Setup Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_BG);

// Orthographic Camera for 2D look
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 20;
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  1,
  1000
);
camera.position.set(0, 5, 20); // Front view
camera.lookAt(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// --- Helpers ---
function createMaterial(color) {
  return new THREE.MeshStandardMaterial({ color });
}

// --- Level Generation ---
const platforms = [];
const hazards = [];
const goals = [];

function createBlock(x, y, z, width, height, depth, type = 'solid') {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  let material;
  
  if (type === 'solid') material = createMaterial(0x888888); // Grey stone
  else if (type === 'lava') material = createMaterial(0xff3300); // Red lava
  else if (type === 'water') material = createMaterial(0x0033ff); // Blue water
  else if (type === 'acid') material = createMaterial(0x00ff00); // Green acid
  else if (type === 'goal_fire') material = createMaterial(0xffaaaa); 
  else if (type === 'goal_water') material = createMaterial(0xaaffff); 

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Physics data
  const collider = {
    mesh,
    box: new THREE.Box3().setFromObject(mesh),
    type
  };

  if (type === 'solid') platforms.push(collider);
  else if (['lava', 'water', 'acid'].includes(type)) hazards.push(collider);
  else if (type.startsWith('goal')) goals.push(collider);
}

// Build a Simple Level
// Ground
createBlock(0, -1, 0, 30, 2, 5, 'solid');
// Left platform
createBlock(-8, 3, 0, 6, 1, 5, 'solid');
// Right platform
createBlock(8, 4, 0, 6, 1, 5, 'solid');
// Middle high platform
createBlock(0, 7, 0, 8, 1, 5, 'solid');

// Hazards
createBlock(-2, -0.4, 0, 4, 0.2, 4, 'lava'); // Lava pit in middle of ground
createBlock(8, 4.6, 0, 2, 0.2, 4, 'water'); // Water pool on right platform

// Goals
createBlock(-12, 1, 0, 2, 3, 2, 'goal_fire');
createBlock(12, 1, 0, 2, 3, 2, 'goal_water');


// --- Character Factory ---
function createCharacter(colorHex, startX) {
  const group = new THREE.Group();

  const material = new THREE.MeshStandardMaterial({ color: colorHex });
  
  // Body
  const bodyGeo = new THREE.BoxGeometry(0.8, 1, 0.5);
  const body = new THREE.Mesh(bodyGeo, material);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const head = new THREE.Mesh(headGeo, material);
  head.position.y = 1.4;
  head.castShadow = true;
  group.add(head);

  // Legs (Visual only, simple)
  const legGeo = new THREE.BoxGeometry(0.25, 0.6, 0.25);
  const legL = new THREE.Mesh(legGeo, material);
  legL.position.set(-0.2, 0, 0);
  group.add(legL);
  
  const legR = new THREE.Mesh(legGeo, material);
  legR.position.set(0.2, 0, 0);
  group.add(legR);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const armL = new THREE.Mesh(armGeo, material);
  armL.position.set(-0.55, 0.6, 0);
  group.add(armL);

  const armR = new THREE.Mesh(armGeo, material);
  armR.position.set(0.55, 0.6, 0);
  group.add(armR);

  group.position.set(startX, 1, 0);
  scene.add(group);

  return {
    mesh: group,
    velocity: new THREE.Vector3(0, 0, 0),
    isGrounded: false,
    width: 0.8,
    height: 1.8,
    startPos: new THREE.Vector3(startX, 1, 0)
  };
}

const playerFire = createCharacter(0xff4444, -10); // Red
const playerWater = createCharacter(0x4444ff, 10); // Blue

// --- Input Handling ---
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// --- Physics Engine ---
function updatePhysics(player, controls) {
  // Horizontal Movement
  player.velocity.x = 0;
  if (keys[controls.left]) player.velocity.x = -MOVE_SPEED;
  if (keys[controls.right]) player.velocity.x = MOVE_SPEED;

  // Jump
  if (keys[controls.up] && player.isGrounded) {
    player.velocity.y = JUMP_FORCE;
    player.isGrounded = false;
  }

  // Apply Gravity
  player.velocity.y -= GRAVITY;

  // Proposed movement
  const dx = player.velocity.x;
  const dy = player.velocity.y;

  // X Collision
  player.mesh.position.x += dx;
  let playerBox = new THREE.Box3().setFromObject(player.mesh);
  // Shrink box slightly for forgiveness
  playerBox.min.x += 0.1; playerBox.max.x -= 0.1;
  playerBox.min.y += 0.1; playerBox.max.y -= 0.1;

  for (const plat of platforms) {
    if (playerBox.intersectsBox(plat.box)) {
      if (dx > 0) player.mesh.position.x = plat.box.min.x - player.width / 2 - 0.1;
      else if (dx < 0) player.mesh.position.x = plat.box.max.x + player.width / 2 + 0.1;
      player.velocity.x = 0;
    }
  }

  // Y Collision
  player.mesh.position.y += dy;
  playerBox.setFromObject(player.mesh);
  // Re-shrink
  playerBox.min.x += 0.1; playerBox.max.x -= 0.1;

  player.isGrounded = false;

  for (const plat of platforms) {
    if (playerBox.intersectsBox(plat.box)) {
      if (dy < 0) { // Falling
        // Check if we are actually above the platform
        if (player.mesh.position.y > plat.box.max.y) {
           player.mesh.position.y = plat.box.max.y; // Snap to top (pivot is at bottom center roughly, adjusted by mesh construction)
           // Actually our mesh pivot is at (0,0,0) of the group, which is center of legs? 
           // Let's adjust based on bounds.
           // Easier: Raycasting or precise bounds.
           // For this simple demo, snap to box max Y + half height offset?
           // Our character is ~1.8 tall. Pivot is at 0 (feet at ~ -0.3?).
           // Let's rely on the Box3 intersection resolve.
           
           // Simple resolve:
           player.mesh.position.y = plat.box.max.y + 0.01; // Sits on top (Box3 is world space)
           // Actually setFromObject uses world space.
           // The character pivot was set at startX, 1, 0. 
           // The legs go down to -0.3 relative to group? No, legs are at 0, 0, 0 local. 
           // leg height 0.6, pos 0. so feet are at -0.3 local.
           // So if group.y is P, feet are at P - 0.3.
           // We want feet at plat.max.y. So P = plat.max.y + 0.3.
           player.mesh.position.y = plat.box.max.y + 0.3;
           
           player.isGrounded = true;
           player.velocity.y = 0;
        }
      } else if (dy > 0) { // Hitting head
         player.mesh.position.y = plat.box.min.y - 1.8; // Approximate head height
         player.velocity.y = 0;
      }
    }
  }
  
  // Hazard Collision
  playerBox.setFromObject(player.mesh);
  for (const haz of hazards) {
    if (playerBox.intersectsBox(haz.box)) {
      handleHazard(player, haz.type);
    }
  }

  // Bounds check (fall off world)
  if (player.mesh.position.y < -10) respawn(player);
}

function handleHazard(player, type) {
  const isFire = player === playerFire;
  
  if (type === 'lava' && !isFire) respawn(player); // Water dies in lava
  if (type === 'water' && isFire) respawn(player); // Fire dies in water
  if (type === 'acid') respawn(player); // Both die in acid
}

function respawn(player) {
  player.mesh.position.copy(player.startPos);
  player.velocity.set(0, 0, 0);
}

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  updatePhysics(playerFire, { up: 'KeyW', left: 'KeyA', right: 'KeyD' });
  updatePhysics(playerWater, { up: 'ArrowUp', left: 'ArrowLeft', right: 'ArrowRight' });

  // Update Camera to follow midpoint? Or static?
  // Let's keep static for this level size, or smooth follow.
  // Simple follow midpoint
  // const midX = (playerFire.mesh.position.x + playerWater.mesh.position.x) / 2;
  // camera.position.x += (midX - camera.position.x) * 0.1;

  renderer.render(scene, camera);
}

// Window resize handling
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -frustumSize * aspect / 2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
