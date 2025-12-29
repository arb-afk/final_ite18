import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class CameraManager {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.controls = new OrbitControls(camera, domElement);
    
    // Default settings
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 100;
    
    // Start disabled
    this.controls.enabled = false;
    this.active = false;

    // Save original camera state to restore later
    this.savedState = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      target: new THREE.Vector3()
    };
  }

  toggle() {
    if (this.active) {
      this.disable();
    } else {
      this.enable();
    }
    return this.active;
  }

  enable() {
    if (this.active) return;
    this.active = true;
    this.controls.enabled = true;
    
    // Save current game camera state
    this.savedState.position.copy(this.camera.position);
    this.savedState.quaternion.copy(this.camera.quaternion);
    
    // Set controls target to where camera was looking roughly
    // Or just look at center of view. 
    // For platformer, z=0 is usually the plane. 
    // Let's cast a ray or just default to looking at (camera.x, camera.y, 0)
    this.controls.target.set(this.camera.position.x, this.camera.position.y - 5, 0);
    this.controls.update();
    
    console.log("Dev Camera: ENABLED");
  }

  disable() {
    if (!this.active) return;
    this.active = false;
    this.controls.enabled = false;

    // Restore game camera state? 
    // Actually, usually when toggling off, we want to snap back to the player immediately.
    // The main game loop will handle snapping back to players, so we just disable inputs.
    
    console.log("Dev Camera: DISABLED");
  }

  update() {
    if (this.active) {
      this.controls.update();
    }
  }
}