import * as THREE from 'three';

// Tuned for fixed 60Hz timestep
export const GRAVITY = 0.025; 
const MAX_FALL_SPEED = 0.6;
const ACCEL = 0.04; 
const FRICTION = 0.82; 
const JUMP_FORCE = 0.35; // Reduced from 0.45 for lower jump 

export class PhysicsWorld {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; 
    this.movingPlatforms = [];
    this.buttons = [];
    this.doors = [];
    this.levers = [];
    this.boxes = [];
    this.gems = [];
  }

  addBlock(mesh, type, extra = {}) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Cache size so we don't have to recompute from mesh
    const collider = { 
        mesh, 
        box, 
        type, 
        width: size.x, 
        height: size.y,
        id: extra.id || null,
        ...extra 
    };

    if (type === 'moving_platform') {
      this.movingPlatforms.push({ collider, ...extra });
      this.colliders.push(collider);
    } else if (type === 'button') {
      this.buttons.push({ collider, pressed: false, links: extra.links || [] });
      this.colliders.push(collider);
    } else if (type === 'door') {
      this.doors.push({ collider, open: false });
      this.colliders.push(collider);
    } else if (type === 'lever') {
      this.levers.push({ 
        collider, 
        active: false,
        
        // Physics model (Minecraft-style up/down flip)
        angle: Math.PI / 3,         // start pointing upward (~60°)
        angularVelocity: 0,
        
        minAngle: -Math.PI / 3,     // down position (~-60°)
        maxAngle:  Math.PI / 3,     // up position (~60°)
        
        inertia: 1.2,               // higher = heavier
        damping: 0.92,
        gravityBias: 0.015,         // pulls toward nearest side
        
        links: extra.links || []
      });
      this.colliders.push(collider);
    } else if (type === 'box') {
      this.boxes.push({ 
        collider, 
        velocity: new THREE.Vector3(0, 0, 0),
        onGround: false
      });
    } else if (type === 'gem_fire' || type === 'gem_water') {
      this.gems.push(collider);
    } else {
      this.colliders.push(collider);
    }

    return collider;
  }

  clear() {
    this.colliders = [];
    this.movingPlatforms = [];
    this.buttons = [];
    this.doors = [];
    this.levers = [];
    this.boxes = [];
    this.gems = [];
  }

  removeGem(collider) {
    this.gems = this.gems.filter(g => g !== collider);
    this.scene.remove(collider.mesh);
  }

  updateBoxes() {
    for (const b of this.boxes) {
      // Skip physics if being carried
      if (b.isCarried) {
        continue;
      }

      // Gravity
      b.velocity.y -= GRAVITY;
      if (b.velocity.y < -MAX_FALL_SPEED) b.velocity.y = -MAX_FALL_SPEED;

      // Friction - increased for heavier feel
      b.velocity.x *= 0.85; // Reduced from 0.9 to 0.85 (stops faster)
      if (Math.abs(b.velocity.x) < 0.001) b.velocity.x = 0;

      // Move X
      b.collider.mesh.position.x += b.velocity.x;
      this.resolveBoxCollision(b, 'x');

      // Move Y
      b.collider.mesh.position.y += b.velocity.y;
      b.onGround = false;
      this.resolveBoxCollision(b, 'y');

      // Update AABB
      this.updateBoxAABB(b);
      
      // Z Lock
      b.collider.mesh.position.z = 0;
    }
  }

  updateBoxAABB(b) {
      b.collider.box.min.set(
          b.collider.mesh.position.x - b.collider.width / 2,
          b.collider.mesh.position.y - b.collider.height / 2,
          -0.5
      );
      b.collider.box.max.set(
          b.collider.mesh.position.x + b.collider.width / 2,
          b.collider.mesh.position.y + b.collider.height / 2,
          0.5
      );
  }

  resolveBoxCollision(b, axis) {
    const bBox = new THREE.Box3();
    // Predict box based on current position (already applied)
    bBox.min.set(
        b.collider.mesh.position.x - b.collider.width / 2,
        b.collider.mesh.position.y - b.collider.height / 2,
        -0.5
    );
    bBox.max.set(
        b.collider.mesh.position.x + b.collider.width / 2,
        b.collider.mesh.position.y + b.collider.height / 2,
        0.5
    );

    for (const col of this.colliders) {
       // Don't collide with triggers, hazards (lava/water/acid), or itself
       if (col.type === 'button' || col.type === 'lever') continue;
       if (col.type === 'lava' || col.type === 'water' || col.type === 'acid') continue; // Allow boxes through hazards
       if (col.type === 'door' && this.doors.find(d => d.collider === col)?.open) continue;

       if (bBox.intersectsBox(col.box)) {
         if (axis === 'x') {
            if (b.velocity.x > 0) {
               b.collider.mesh.position.x = col.box.min.x - b.collider.width/2 - 0.001;
            } else if (b.velocity.x < 0) {
               b.collider.mesh.position.x = col.box.max.x + b.collider.width/2 + 0.001;
            }
            b.velocity.x = 0;
         } else {
            if (b.velocity.y < 0) { // Landed
              if (b.collider.mesh.position.y > col.box.min.y) {
                 b.collider.mesh.position.y = col.box.max.y + b.collider.height/2 + 0.001;
                 b.velocity.y = 0;
                 b.onGround = true;
              }
            } else if (b.velocity.y > 0) {
               b.collider.mesh.position.y = col.box.min.y - b.collider.height/2 - 0.001;
               b.velocity.y = 0;
            }
         }
         this.updateBoxAABB(b);
         // Update bBox local var for next check
         bBox.copy(b.collider.box);
       }
    }
  }

  updateSystems(players, onEvent) {
    // 0. Physics for Boxes
    this.updateBoxes();

    // 1. Reset Buttons
    for (const b of this.buttons) {
      const wasPressed = b.pressed;
      b.pressed = false;
      
      const triggerBox = b.collider.box.clone();
      triggerBox.max.y += 0.2; 

      // Check Players
      for (const p of players) {
        const pBox = new THREE.Box3();
        pBox.min.set(p.mesh.position.x - p.width/2, p.mesh.position.y - p.height/2, -0.5);
        pBox.max.set(p.mesh.position.x + p.width/2, p.mesh.position.y + p.height/2, 0.5);

        if (triggerBox.intersectsBox(pBox)) {
          b.pressed = true;
          break;
        }
      }

      // Check Boxes
      if (!b.pressed) {
        for (const box of this.boxes) {
          if (triggerBox.intersectsBox(box.collider.box)) {
            b.pressed = true;
            break;
          }
        }
      }
      
      if (!wasPressed && b.pressed && onEvent) onEvent('button');

      // Visual feedback
      if (b.originalY === undefined) b.originalY = b.collider.mesh.position.y;
      const targetY = b.originalY - (b.pressed ? 0.1 : 0);
      b.collider.mesh.position.y += (targetY - b.collider.mesh.position.y) * 0.2;
      
      b.collider.box.min.set(
          b.collider.mesh.position.x - b.collider.width / 2,
          b.collider.mesh.position.y - b.collider.height / 2,
          -0.5
      );
      b.collider.box.max.set(
          b.collider.mesh.position.x + b.collider.width / 2,
          b.collider.mesh.position.y + b.collider.height / 2,
          0.5
      );
    }

    // 2. Levers
    for (const l of this.levers) {
      // Gravity bias toward nearest side
      const target = l.angle > 0 ? l.maxAngle : l.minAngle;
      const pull = (target - l.angle) * l.gravityBias;

      l.angularVelocity += pull;
      l.angularVelocity *= l.damping;

      // Integrate
      l.angle += l.angularVelocity;

      // Clamp
      if (l.angle < l.minAngle) {
        l.angle = l.minAngle;
        l.angularVelocity = 0;
      }
      if (l.angle > l.maxAngle) {
        l.angle = l.maxAngle;
        l.angularVelocity = 0;
      }

      // Determine active state (active when pointing UP, angle > 0)
      const wasActive = l.active;
      l.active = l.angle > 0;

      // Rotate stick mesh ONLY (child[1] should be the stick)
      if (l.collider.mesh.children[1]) {
        l.collider.mesh.children[1].rotation.z = l.angle;
      }

      // Sound effect on state change
      if (!wasActive && l.active && onEvent) {
        onEvent('button'); // Reuse button sound
      }
    }

    // 3. Update Linked Objects (Doors/Platforms)
    const buttonActiveIds = new Set();
    const leverActiveCounts = {};

    // Collect active IDs from Buttons (OR logic)
    this.buttons.forEach(b => {
      if (b.pressed) b.links.forEach(id => buttonActiveIds.add(id));
    });
    // Collect active counts from Levers (XOR logic)
    this.levers.forEach(l => {
      if (l.active) {
          l.links.forEach(id => {
             leverActiveCounts[id] = (leverActiveCounts[id] || 0) + 1;
          });
      }
    });

    const isIdActive = (id) => {
        const btn = buttonActiveIds.has(id);
        const count = leverActiveCounts[id] || 0;
        const lev = count % 2 !== 0; 
        return btn || lev;
    };

    for (const d of this.doors) {
      const shouldBeOpen = isIdActive(d.collider.id);
      d.open = shouldBeOpen;
      
      if (d.originalY === undefined) d.originalY = d.collider.mesh.position.y;
      const targetY = d.originalY + (d.open ? 3.5 : 0);
      d.collider.mesh.position.y += (targetY - d.collider.mesh.position.y) * 0.1;
      
      d.collider.box.min.set(
          d.collider.mesh.position.x - d.collider.width / 2,
          d.collider.mesh.position.y - d.collider.height / 2,
          -0.5
      );
      d.collider.box.max.set(
          d.collider.mesh.position.x + d.collider.width / 2,
          d.collider.mesh.position.y + d.collider.height / 2,
          0.5
      );
    }

    for (const p of this.movingPlatforms) {
      p.active = isIdActive(p.collider.id);
    }
  }

  // No delta passed here! We assume this runs on a fixed 1/60s tick.
  update(player, inputs, onEvent) {
    // Check for box pickup/drop (E key or Space)
    if (inputs.pickup && !player.lastPickup) {
      this.handleBoxPickup(player);
    }
    player.lastPickup = inputs.pickup;

    // If carrying a box, update its position
    if (player.carryingBox) {
      const box = player.carryingBox;
      
      // Step 1: Track box velocity by storing previous position
      if (!box.prevPosition) {
        box.prevPosition = box.collider.mesh.position.clone();
      }
      
      // Calculate new position - box sits flush on player's head
      const newX = player.mesh.position.x;
      const newY = player.mesh.position.y + player.height / 2 + box.collider.height / 2;
      
      // Calculate velocity from movement delta
      box.velocity.x = newX - box.prevPosition.x;
      box.velocity.y = newY - box.prevPosition.y;
      
      // Update position
      box.collider.mesh.position.x = newX;
      box.collider.mesh.position.y = newY;
      box.collider.mesh.position.z = 0;
      
      // Store for next frame
      box.prevPosition.copy(box.collider.mesh.position);
      
      // Update box AABB
      this.updateBoxAABB(box);
    }

    // 1. Horizontal Movement
    const moveSpeed = player.carryingBox ? 0.5 : 1.0; // Half speed when carrying
    
    if (inputs.left) {
      player.velocity.x -= ACCEL * moveSpeed;
      player.lastDirection = -1;
    }
    if (inputs.right) {
      player.velocity.x += ACCEL * moveSpeed;
      player.lastDirection = 1;
    }
    
    // Much stronger friction when carrying (feels heavier)
    const dampFactor = player.carryingBox ? 4 : 12;
    player.velocity.x = THREE.MathUtils.damp(player.velocity.x, 0, dampFactor, 1/60);

    // 2. Vertical Movement
    player.velocity.y -= GRAVITY;
    if (player.velocity.y < -MAX_FALL_SPEED) player.velocity.y = -MAX_FALL_SPEED;

    // Jump (can't jump while carrying)
    if (inputs.up && player.isGrounded && !player.carryingBox) {
      player.velocity.y = JUMP_FORCE; 
      
      // Only play jump sound if cooldown is expired (prevents rapid triggers)
      if (onEvent && (player.jumpSoundCooldown === undefined || player.jumpSoundCooldown <= 0)) {
        onEvent('jump');
        player.jumpSoundCooldown = 10; // ~0.17s cooldown at 60fps
      }

       // Inherit platform momentum (only on first jump/grounded jump)
       if (player.ridingPlatform) {
           // ridingPlatform can be either the platform object or the collider
           const platVel = player.ridingPlatform.collider?.currentVelocity || 
                           player.ridingPlatform.currentVelocity || 
                           player.ridingPlatform.velocity;
           if (platVel) {
             player.velocity.x += platVel.x;
           }
       }

      player.isGrounded = false;
      player.ridingPlatform = null;
    }
    
    // Decrement jump sound cooldown
    if (player.jumpSoundCooldown !== undefined && player.jumpSoundCooldown > 0) {
      player.jumpSoundCooldown--;
    }

    // 3. Move & Resolve Collisions

    // Apply Platform Velocity
    if (player.ridingPlatform) {
       const platVel = player.ridingPlatform.currentVelocity || 
                       player.ridingPlatform.velocity || 
                       (player.ridingPlatform.collider && player.ridingPlatform.collider.currentVelocity);
       if (platVel) {
           player.mesh.position.x += platVel.x;
           if (platVel.y < 0) player.mesh.position.y += platVel.y;
       }
    }
    
    // X Move
    player.mesh.position.x += player.velocity.x;
    this.resolveCollision(player, 'x');

    // Y Move
    player.mesh.position.y += player.velocity.y;
    player.isGrounded = false; 
    this.resolveCollision(player, 'y');

    // Z Lock
    player.mesh.position.z = 0;

    // Bounds Check
    if (player.mesh.position.y < -20) return 'dead';

    // Check hazards and goals using manually computed box
    const playerBox = new THREE.Box3();
    // Reduce hitbox slightly for feel
    const w = player.width - 0.1; 
    const h = player.height - 0.1;
    
    playerBox.min.set(
        player.mesh.position.x - w / 2,
        player.mesh.position.y - h / 2,
        -0.5
    );
    playerBox.max.set(
        player.mesh.position.x + w / 2,
        player.mesh.position.y + h / 2,
        0.5
    );

    // 1. Collectibles (Gems)
    for (const gem of this.gems) {
        if (playerBox.intersectsBox(gem.box)) {
            // Check if player matches gem element
            if ((gem.type === 'gem_fire' && player.element === 'fire') ||
                (gem.type === 'gem_water' && player.element === 'water')) {
                const type = gem.type;
                this.removeGem(gem);
                return type;
            }
        }
    }

    for (const col of this.colliders) {
      if (col.type === 'solid' || col.type === 'moving_platform') continue;
      
      // For hazards/goals we can use their cached box (static)
      // If moving hazards existed, we'd need to update them here too, but they don't in this project.
      
      if (playerBox.intersectsBox(col.box)) return col.type;
    }
    
    return null;
  }

  resolveCollision(player, axis) {
    // 1. Compute playerBox manually
    const playerBox = new THREE.Box3();
    playerBox.min.set(
        player.mesh.position.x - player.width / 2,
        player.mesh.position.y - player.height / 2,
        -0.5
    );
    playerBox.max.set(
        player.mesh.position.x + player.width / 2,
        player.mesh.position.y + player.height / 2,
        0.5
    );

    const skin = 0.0005;
    const solids = this.colliders;

    // Check collision against all boxes (including carried ones)
    for (const boxData of this.boxes) {
      // Skip collision with box you're carrying - NON-NEGOTIABLE
      if (boxData.isCarried && boxData.carrier === player) continue;
      
      // CRITICAL: Update box AABB before collision check (prevents freeze)
      this.updateBoxAABB(boxData);
      
      const col = boxData.collider;
      
      if (playerBox.intersectsBox(col.box)) {
        if (axis === 'x') {
          // Push the box - reduced transfer for heavier feel
          const pushForce = player.velocity.x * 0.25; // Reduced from 0.5 to 0.25
          boxData.velocity.x += pushForce;
          
          // Player slows down significantly (heavy box resistance)
          player.velocity.x *= 0.2; // Reduced from 0.3 to 0.2
          
          // Prevent overlap
          if (player.velocity.x > 0) { 
             player.mesh.position.x = col.box.min.x - player.width/2 - skin;
          } else if (player.velocity.x < 0) { 
             player.mesh.position.x = col.box.max.x + player.width/2 + skin;
          }
        } else {
          if (player.velocity.y < 0) { // Falling - can land on boxes
             if (player.mesh.position.y > col.box.min.y) {
                 player.mesh.position.y = col.box.max.y + player.height / 2 + skin;
                 player.velocity.y = 0;
                 player.isGrounded = true;
                 // Step 2: Let player ride the box like a platform
                 player.ridingPlatform = boxData;
             }
          } else if (player.velocity.y > 0) { // Hitting head on box bottom
             player.mesh.position.y = col.box.min.y - player.height / 2 - skin;
             player.velocity.y = 0;
          }
        }
        // Update playerBox for next check
        playerBox.min.set(
            player.mesh.position.x - player.width / 2,
            player.mesh.position.y - player.height / 2,
            -0.5
        );
        playerBox.max.set(
            player.mesh.position.x + player.width / 2,
            player.mesh.position.y + player.height / 2,
            0.5
        );
      }
    }

    for (const col of solids) {
      // Lever Interaction (Physical Push)
      if (col.type === 'lever') {
          if (playerBox.intersectsBox(col.box)) {
              // Find the lever object
              const lever = this.levers.find(l => l.collider === col);
              if (lever) {
                  // Direction of push
                  const pushDir = Math.sign(player.velocity.x);
                  if (pushDir !== 0) {
                      // Apply torque based on push direction
                      lever.angularVelocity += pushDir * 0.04 / lever.inertia;
                  }
              }
          }
          continue; // Levers are not solid
      }

      if (col.type !== 'solid' && col.type !== 'moving_platform' && col.type !== 'door') continue;

      // Special door logic: only solid if NOT open
      if (col.type === 'door') {
          const doorObj = this.doors.find(d => d.collider === col);
          if (doorObj && doorObj.open) continue;
      }
      
      // Update moving platform box manually based on current position
      if (col.type === 'moving_platform') {
          col.box.min.set(
              col.mesh.position.x - col.width / 2,
              col.mesh.position.y - col.height / 2,
              -0.5
          );
          col.box.max.set(
              col.mesh.position.x + col.width / 2,
              col.mesh.position.y + col.height / 2,
              0.5
          );
      }

      if (playerBox.intersectsBox(col.box)) {
        if (axis === 'x') {
          if (player.velocity.x > 0) { 
             player.mesh.position.x = col.box.min.x - player.width/2 - skin;
          } else if (player.velocity.x < 0) { 
             player.mesh.position.x = col.box.max.x + player.width/2 + skin;
          }
          player.velocity.x = 0;
        } else {
          if (player.velocity.y < 0) { // Falling
             // Ensure we are somewhat above the bottom of the block to avoid snapping from below
             if (player.mesh.position.y > col.box.min.y) {
                 player.mesh.position.y = col.box.max.y + player.height / 2 + skin;
                 player.velocity.y = 0;
                 player.isGrounded = true;
                 // Find the platform object (not just collider) so we can access currentVelocity
                 if (col.type === 'moving_platform') {
                   const platform = this.movingPlatforms.find(p => p.collider === col);
                   player.ridingPlatform = platform || col;
                 } else {
                   player.ridingPlatform = null;
                 }
             }
          } else if (player.velocity.y > 0) { // Hitting Head
             player.mesh.position.y = col.box.min.y - player.height / 2 - skin;
             player.velocity.y = 0;
          }
        }
        // Update playerBox for next check
        playerBox.min.set(
            player.mesh.position.x - player.width / 2,
            player.mesh.position.y - player.height / 2,
            -0.5
        );
        playerBox.max.set(
            player.mesh.position.x + player.width / 2,
            player.mesh.position.y + player.height / 2,
            0.5
        );
      }
    }
  }

  syncPlayersToPlatforms(players) {
    // After platforms move, ensure players riding them stay on top
    for (const player of players) {
      if (player.ridingPlatform && player.isGrounded) {
        // Check if it's a box (boxes have collider.type === 'box')
        if (player.ridingPlatform.collider && player.ridingPlatform.collider.type === 'box') {
          // This is a box - boxes are handled by normal collision, skip syncing
          continue;
        }
        
        // It's a moving platform
        const platform = player.ridingPlatform.collider ? player.ridingPlatform : 
                         this.movingPlatforms.find(p => p.collider === player.ridingPlatform);
        
        if (platform && platform.collider) {
          const platformVel = platform.collider.currentVelocity;
          
          // Apply platform velocity horizontally (clamped to prevent sudden launches)
          if (platformVel) {
            // Clamp X velocity to prevent sudden horizontal movement
            const maxVel = 0.3;
            const velX = Math.max(-maxVel, Math.min(maxVel, platformVel.x));
            player.mesh.position.x += velX;
          }
          
          // Always keep player exactly on top of platform surface
          // Position directly (don't use Y velocity) to prevent launching
          const targetY = platform.collider.mesh.position.y + platform.collider.height / 2 + player.height / 2 + 0.001;
          player.mesh.position.y = targetY;
        }
        // If platform not found, it might be a box - don't clear it, boxes handle themselves
      }
    }
  }

  updatePlatforms() {
    // Fixed speed for platforms
    const f = 1.0; 
    for (const p of this.movingPlatforms) {
      // Check if platform is linked to a lever/button (controlled by activeIds)
      const isLeverControlled = this.levers.some(l => l.links.includes(p.collider.id)) ||
                                 this.buttons.some(b => b.links.includes(p.collider.id));
      
      if (isLeverControlled) {
        // Lever-controlled: Move to target position based on active state
        
        // Initialize position if not set
        if (p.t === undefined) {
          // If active, start at 1.0 (End), else 0.0 (Start)
          p.t = p.active ? 1.0 : 0.0;
          const startPos = new THREE.Vector3().lerpVectors(p.start, p.end, p.t);
          p.collider.mesh.position.copy(startPos);
        }
        
        const dist = p.start.distanceTo(p.end);
        const targetT = p.active ? 1.0 : 0.0; // Up when active, down when inactive
        
        // Smoothly move towards target position
        const moveSpeed = (p.speed || 0.05) * f;
        const step = moveSpeed / dist;
        
        if (p.t < targetT) {
          p.t = Math.min(p.t + step, targetT);
        } else if (p.t > targetT) {
          p.t = Math.max(p.t - step, targetT);
        }
        
        const newPos = new THREE.Vector3().lerpVectors(p.start, p.end, p.t);
        const velocity = new THREE.Vector3().subVectors(newPos, p.collider.mesh.position);
        
        // Clamp velocity to prevent launching players when platform starts moving
        const maxVelocity = 0.3; // Maximum velocity per frame
        if (velocity.length() > maxVelocity) {
          velocity.normalize().multiplyScalar(maxVelocity);
        }
        
        p.collider.mesh.position.copy(newPos);
        p.collider.currentVelocity = velocity;
      } else {
        // Always-active platform: Continuous oscillation
        if (!p.active) continue;

        const dist = p.start.distanceTo(p.end);
        if (!p.t) p.t = 0;
        if (!p.direction) p.direction = 1;

        const moveStep = (p.speed || 0.05) * p.direction * f;
        p.t += moveStep / dist;

        if (p.t >= 1) { p.t = 1; p.direction = -1; }
        if (p.t <= 0) { p.t = 0; p.direction = 1; }

        const newPos = new THREE.Vector3().lerpVectors(p.start, p.end, p.t);
        const velocity = new THREE.Vector3().subVectors(newPos, p.collider.mesh.position);
        
        // Clamp velocity to prevent launching players
        const maxVelocity = 0.3; // Maximum velocity per frame
        if (velocity.length() > maxVelocity) {
          velocity.normalize().multiplyScalar(maxVelocity);
        }
        
        p.collider.mesh.position.copy(newPos);
        p.collider.currentVelocity = velocity;
      }
    }
  }

  handleBoxPickup(player) {
    if (player.carryingBox) {
      // Launch the box like a projectile
      const box = player.carryingBox;
      
      // Much stronger throw power
      const throwPower = 0.6; // Doubled from 0.3
      const upwardPower = 0.35; // Increased arc
      
      // Horizontal throw in direction of movement (or facing direction)
      if (Math.abs(player.velocity.x) > 0.01) {
        // Throw in movement direction with momentum
        box.velocity.x = player.velocity.x * 2 + Math.sign(player.velocity.x) * throwPower;
      } else {
        // Default throw forward with full power
        box.velocity.x = throwPower * (player.lastDirection || 1);
      }
      
      // Strong upward launch
      box.velocity.y = upwardPower;
      
      // Clear carried state
      box.isCarried = false;
      box.carrier = null;
      player.carryingBox = null;
      return;
    }

    // Try to pick up a nearby box
    const playerBox = new THREE.Box3();
    const w = player.width + 1.5; // Wider range for pickup
    const h = player.height;
    
    playerBox.min.set(
      player.mesh.position.x - w / 2,
      player.mesh.position.y - h / 2,
      -0.5
    );
    playerBox.max.set(
      player.mesh.position.x + w / 2,
      player.mesh.position.y + h / 2,
      0.5
    );

    // Find closest box
    for (const box of this.boxes) {
      if (playerBox.intersectsBox(box.collider.box)) {
        // Mark as carried
        player.carryingBox = box;
        box.isCarried = true;
        box.carrier = player;
        
        // Clear grounding to prevent one-frame snap
        player.isGrounded = false;
        player.ridingPlatform = null;
        
        // Immediately move box to carried position
        const targetX = player.mesh.position.x;
        const targetY = player.mesh.position.y + player.height / 2 + box.collider.height / 2;
        
        box.collider.mesh.position.x = targetX;
        box.collider.mesh.position.y = targetY;
        box.collider.mesh.position.z = 0;
        
        // Reset velocity and set prevPosition to NEW position
        box.velocity.set(0, 0, 0);
        box.prevPosition = box.collider.mesh.position.clone();
        
        // Update AABB
        this.updateBoxAABB(box);
        
        return;
      }
    }
  }
}