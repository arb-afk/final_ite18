import * as THREE from 'three';
import { Level1 } from './levels/Level1.js';
import { Level2 } from './levels/Level2.js';
import { VisualEffects } from './VisualEffects.js';

export class LevelManager {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physics = physicsWorld;
    this.levels = this.getLevels();
    this.activeObjects = [];
    this.vfx = new VisualEffects(scene);
    this.poolObjects = []; // Track pool visuals for cleanup
  }

  getLevels() {
    return [Level1, Level2];
  }
      
        loadLevel(index) {
          this.clearLevel();
          const data = this.levels[index];
          if (!data) return null;
      
          document.getElementById('level-info').innerText = `${data.name}`;
      
              // Static Blocks
              data.blocks.forEach(b => this.createBlock(b));
          
              // Gems
              if (data.gems) {
                  data.gems.forEach(g => {
                      const mesh = this.createMesh(g.x, g.y, g.z, 0.6, 0.6, 0.6, g.type);
                      this.physics.addBlock(mesh, g.type);
                  });
              }
          
              // Buttons
              if (data.buttons) {
            data.buttons.forEach(b => {
              const mesh = this.createMesh(b.x, b.y, b.z, b.w, b.h, b.d, 'button');
              this.physics.addBlock(mesh, 'button', { links: b.links });
            });
          }
      
          // Levers
          if (data.levers) {
              data.levers.forEach(l => {
                  const mesh = this.createMesh(l.x, l.y, l.z, l.w, l.h, l.d, 'lever');
                  this.physics.addBlock(mesh, 'lever', { links: l.links });
              });
          }
      
          // Pushable Boxes
          if (data.pushable) {
              data.pushable.forEach(b => {
                  const mesh = this.createMesh(b.x, b.y, b.z, b.w, b.h, b.d, 'box');
                  this.physics.addBlock(mesh, 'box');
              });
          }
      
          // Moving Platforms
          if (data.moving) {
            data.moving.forEach(m => {
              const mesh = this.createMesh(m.start[0], m.start[1], m.start[2], m.w, m.h, m.d, 'moving_platform');
              this.physics.addBlock(mesh, 'moving_platform', {
                id: m.id,
                start: new THREE.Vector3(...m.start),
                end: new THREE.Vector3(...m.end),
                speed: m.speed,
                active: m.active
              });
            });
          }
      
          // Goals
          if (data.goals && Array.isArray(data.goals)) {
          data.goals.forEach(g => {
            // Offset visuals slightly so they don't z-fight, but collider is centered
            this.createBlock({ x: g.x, y: g.y, z: g.z, w: 1.5, h: 2.5, d: 1.5, type: g.type });
          });
          }
      
          return data.start;
        }
      
        createBlock(b) {
          const mesh = this.createMesh(b.x, b.y, b.z, b.w, b.h, b.d, b.type, b);
          this.physics.addBlock(mesh, b.type, { id: b.id });
        }
      
  createMesh(x, y, z, w, h, d, type, extraData = {}) {
    // Special handling for pool with walls and liquid
    if (type === 'pool') {
      return this.createPoolWithWalls(x, y, z, w, h, d, extraData.poolType || 'lava');
    }

    // Special handling for lever - structured mesh
    if (type === 'lever') {
      return this.createLeverMesh(x, y, z, w, h, d);
    }

            // Special handling for liquids to create fancy visuals
            if (['lava', 'water', 'acid'].includes(type)) {
               // Create visual pool
               const poolParts = this.vfx.createPool(x, y, z, w, d, type);
               this.poolObjects.push(...poolParts);
        
               // Create invisible physics box
               const geo = new THREE.BoxGeometry(w, h, d);
               const mat = new THREE.MeshBasicMaterial({ visible: false });
               const mesh = new THREE.Mesh(geo, mat);
               mesh.position.set(x, y, z);
               this.scene.add(mesh);
               this.activeObjects.push(mesh);
               return mesh;
            }
        
            const geo = new THREE.BoxGeometry(w, h, d);
            let color = 0x888888;
            let emissive = 0x000000;
            let transparent = false;
            let opacity = 1.0;
            let roughness = 0.5;
        
            if (type === 'goal_fire') { color = 0xff4444; emissive = 0x550000; } 
            else if (type === 'goal_water') { color = 0x4488ff; emissive = 0x002255; }
            else if (type === 'moving_platform') { color = 0xdda0dd; } 
            else if (type === 'button') { color = 0xffff00; emissive = 0x333300; }
            else if (type === 'door') { color = 0x555555; emissive = 0x222222; }
            else if (type === 'lever') { color = 0xffaa00; emissive = 0x442200; } // Orange stick
            else if (type === 'box') { color = 0x8b4513; } // Wood
            else if (type === 'gem_fire') { color = 0xff0000; emissive = 0x440000; }
            else if (type === 'gem_water') { color = 0x0000ff; emissive = 0x000044; }
            else if (type === 'support') { color = 0x5a5a3a; roughness = 0.9; } // Matches Jagged Basin
        
            const mat = new THREE.MeshStandardMaterial({ 
              color, 
              emissive, 
              roughness, 
              metalness: 0.1,
              transparent,
              opacity
            });
        
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            if (type.startsWith('gem')) {
                mesh.rotation.set(Math.PI/4, 0, Math.PI/4);
                // Add glow light
                const lightColor = (type === 'gem_fire') ? 0xff0000 : 0x0066ff;
                const light = new THREE.PointLight(lightColor, 1.5, 4);
                mesh.add(light);
                
                // Mark for rotation animation
                mesh.userData.isGem = true;
                mesh.userData.rotationSpeed = 0.02;
            }
            
            this.scene.add(mesh);
            this.activeObjects.push(mesh);
            return mesh;
          }
        
          clearLevel() {
            this.activeObjects.forEach(obj => {
              this.scene.remove(obj);
              if (obj.geometry) obj.geometry.dispose();
              if (obj.material) {
                // Handle array of materials (multi-material meshes)
                if (Array.isArray(obj.material)) {
                  obj.material.forEach(mat => mat.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            });
            this.activeObjects = [];
            
            // Clear VFX pools
            this.poolObjects.forEach(obj => {
                this.scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                  if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                  } else {
                    obj.material.dispose();
                  }
                }
            });
            this.poolObjects = [];
            this.vfx.animatedMeshes = [];
        
            this.physics.clear();
          }

  createPoolWithWalls(x, y, z, w, h, d, poolType) {
    const wallThickness = 0.2;
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888, // Match ground color
      roughness: 0.7,
      metalness: 0.1
    });

    // Create 4 walls + floor
    const walls = [];
    
    // Floor (visible)
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.2, d),
      wallMaterial
    );
    floor.position.set(x, y - h/2 + 1.2, z); // Raised higher
    this.scene.add(floor);
    this.activeObjects.push(floor);
    walls.push(floor);
    
    // Add floor collision (solid platform for walking)
    this.physics.addBlock(floor, 'solid');

    // Left wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, h, d),
      wallMaterial
    );
    leftWall.position.set(x - w/2 + wallThickness/2, y, z);
    this.scene.add(leftWall);
    this.activeObjects.push(leftWall);
    walls.push(leftWall);
    this.physics.addBlock(leftWall, 'solid');

    // Right wall
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, h, d),
      wallMaterial
    );
    rightWall.position.set(x + w/2 - wallThickness/2, y, z);
    this.scene.add(rightWall);
    this.activeObjects.push(rightWall);
    walls.push(rightWall);
    this.physics.addBlock(rightWall, 'solid');

    // Front wall
    const frontWall = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, wallThickness),
      wallMaterial
    );
    frontWall.position.set(x, y, z + d/2 - wallThickness/2);
    this.scene.add(frontWall);
    this.activeObjects.push(frontWall);
    walls.push(frontWall);
    this.physics.addBlock(frontWall, 'solid');

    // Back wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, wallThickness),
      wallMaterial
    );
    backWall.position.set(x, y, z - d/2 + wallThickness/2);
    this.scene.add(backWall);
    this.activeObjects.push(backWall);
    walls.push(backWall);
    this.physics.addBlock(backWall, 'solid');

    // Add liquid inside the pool
    let liquidColor, emissiveColor, glowColor;
    if (poolType === 'lava') {
      liquidColor = 0xff3300; emissiveColor = 0xaa0000; glowColor = 0xff3300;
    } else if (poolType === 'water') {
      liquidColor = 0x3366ff; emissiveColor = 0x003366; glowColor = 0x3366ff;
    } else if (poolType === 'acid') {
      liquidColor = 0x00ff00; emissiveColor = 0x004400; glowColor = 0x00ff00;
    }

    // Liquid surface (animated)
    const liquidGeo = new THREE.PlaneGeometry(w - wallThickness * 2, d - wallThickness * 2, 20, 20);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: liquidColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const liquidSurface = new THREE.Mesh(liquidGeo, liquidMat);
    liquidSurface.rotation.x = -Math.PI / 2;
    liquidSurface.position.set(x, y + h/2 - 0.2, z); // Near top of pool
    this.scene.add(liquidSurface);
    this.activeObjects.push(liquidSurface);
    this.vfx.animatedMeshes.push(liquidSurface);

    // Add glow light
    const glow = new THREE.PointLight(glowColor, 1.5, 8);
    glow.position.set(x, y + h/2, z);
    this.scene.add(glow);
    this.activeObjects.push(glow);

    // Create invisible physics collider for hazard detection (fills the pool volume)
    const hazardBox = new THREE.Mesh(
      new THREE.BoxGeometry(w - wallThickness * 2, h - 0.2, d - wallThickness * 2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hazardBox.position.set(x, y, z);
    this.scene.add(hazardBox);
    this.activeObjects.push(hazardBox);
    this.physics.addBlock(hazardBox, poolType);

    // Return a dummy mesh for the physics to track
    const dummy = new THREE.Object3D();
    dummy.position.set(x, y, z);
    return dummy;
  }

  createLeverMesh(x, y, z, w, h, d) {
    // Create lever group (root for rotation)
    const leverRoot = new THREE.Group();
    leverRoot.position.set(x, y, z);

    // Base (mounting point on ground) - tiny block attached to surface
    const baseWidth = 0.4;
    const baseHeight = 0.15;  // Thin mounting plate
    const baseDepth = 0.4;
    
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.8,
      metalness: 0.2
    });
    
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth),
      baseMaterial
    );
    // Base sits ON the ground (bottom of the lever space)
    base.position.y = -h/2 + baseHeight/2;
    base.castShadow = true;
    base.receiveShadow = true;
    leverRoot.add(base);

    // Stick/arm (rotates) - thin stick pivoting from base
    const stickWidth = 0.1;
    const stickHeight = 1.0;   // Lever stick length
    const stickDepth = 0.1;
    
    const stickMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,  // Brown wood color
      roughness: 0.6,
      metalness: 0.1
    });
    
    const stick = new THREE.Mesh(
      new THREE.BoxGeometry(stickWidth, stickHeight, stickDepth),
      stickMaterial
    );
    
    // CRITICAL: Pivot point at the BOTTOM of the stick
    // Translate geometry so origin is at bottom
    stick.geometry.translate(0, stickHeight/2, 0);
    
    // Position stick at the top of the base (pivot point)
    stick.position.y = -h/2 + baseHeight;
    
    stick.castShadow = true;
    stick.receiveShadow = true;
    leverRoot.add(stick);

    // Set initial rotation (pointing upward like Minecraft)
    stick.rotation.z = Math.PI / 3; // ~60 degrees, pointing up

    // Add to scene
    this.scene.add(leverRoot);
    this.activeObjects.push(leverRoot);

    return leverRoot;
  }

  createGroundWithPools(x, y, z, w, h, d, pools) {
    // Create the main ground shape
    const shape = new THREE.Shape();
    shape.moveTo(-w/2, -d/2);
    shape.lineTo(w/2, -d/2);
    shape.lineTo(w/2, d/2);
    shape.lineTo(-w/2, d/2);
    shape.lineTo(-w/2, -d/2);

    // Cut out holes for each pool
    pools.forEach(pool => {
      const holeX = pool.x - x; // Relative to ground center
      const holeZ = pool.z - z;
      const hw = pool.w / 2;
      const hd = pool.d / 2;

      const hole = new THREE.Path();
      hole.moveTo(holeX - hw, holeZ - hd);
      hole.lineTo(holeX + hw, holeZ - hd);
      hole.lineTo(holeX + hw, holeZ + hd);
      hole.lineTo(holeX - hw, holeZ + hd);
      hole.lineTo(holeX - hw, holeZ - hd);
      shape.holes.push(hole);
    });

    // Extrude the shape
    const extrudeSettings = {
      depth: h,
      bevelEnabled: false
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Rotate and position correctly
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, -h/2, 0);

    const material = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.7,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.activeObjects.push(mesh);

    // Now create the liquid pools in the cutouts
    pools.forEach(pool => {
      const poolY = y + h/2 - 0.4; // Slightly recessed
      const poolParts = this.vfx.createPool(pool.x, poolY, pool.z, pool.w, pool.d, pool.type);
      this.poolObjects.push(...poolParts);

      // Create invisible physics box for hazard
      const poolGeo = new THREE.BoxGeometry(pool.w, 0.3, pool.d);
      const poolMat = new THREE.MeshBasicMaterial({ visible: false });
      const poolMesh = new THREE.Mesh(poolGeo, poolMat);
      poolMesh.position.set(pool.x, poolY, pool.z);
      this.scene.add(poolMesh);
      this.activeObjects.push(poolMesh);
      this.physics.addBlock(poolMesh, pool.type);
    });

    return mesh;
          }}