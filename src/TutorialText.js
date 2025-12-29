import * as THREE from 'three';

export class TutorialTextManager {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.textElements = [];
    this.shownTexts = new Set();
    this.container = null;
    this.init();
  }

  init() {
    // Create container for tutorial text
    this.container = document.createElement('div');
    this.container.id = 'tutorial-text-container';
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '50'; // Behind game over screen 
    document.body.appendChild(this.container);
  }

  createText(id, text, position, condition = null, color = '#ffffff', fontSize = '24px') {
    const textEl = document.createElement('div');
    textEl.id = `tutorial-${id}`;
    textEl.textContent = text;
    textEl.style.position = 'absolute';
    textEl.style.color = color;
    textEl.style.fontSize = fontSize;
    textEl.style.fontWeight = '600';
    textEl.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    textEl.style.textShadow = `
      0 0 10px rgba(0,0,0,0.9),
      0 0 20px ${color}40,
      2px 2px 4px rgba(0,0,0,0.8),
      0 0 30px rgba(0,0,0,0.5)
    `;
    textEl.style.whiteSpace = 'normal';
    textEl.style.maxWidth = '400px';
    textEl.style.textAlign = 'center';
    textEl.style.opacity = '0';
    textEl.style.transition = 'opacity 0.8s ease-in-out, transform 0.8s ease-out';
    textEl.style.pointerEvents = 'none';
    textEl.style.userSelect = 'none';
    textEl.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))';
    textEl.style.padding = '12px 20px';
    textEl.style.borderRadius = '12px';
    textEl.style.border = `2px solid ${color}60`;
    textEl.style.backdropFilter = 'blur(10px)';
    textEl.style.boxShadow = `
      0 4px 20px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.1),
      0 0 30px ${color}30
    `;
    textEl.style.transform = 'translate(-50%, -50%) scale(0.9)';
    textEl.style.letterSpacing = '0.5px';
    textEl.style.lineHeight = '1.4';
    
    this.container.appendChild(textEl);
    
    this.textElements.push({
      id,
      element: textEl,
      position: position,
      condition,
      shown: false
    });
  }

  checkCondition(condition, playerFire, playerWater, physics) {
    if (!condition) return true;
    
    const { type, ...params } = condition;
    
    switch (type) {
      case 'playerNear':
        const player = params.player === 'fire' ? playerFire : playerWater;
        const dist = player.mesh.position.distanceTo(new THREE.Vector3(params.x, params.y, params.z));
        return dist < (params.radius || 5);
        
      case 'anyPlayerNear':
        const fireDist = playerFire.mesh.position.distanceTo(new THREE.Vector3(params.x, params.y, params.z));
        const waterDist = playerWater.mesh.position.distanceTo(new THREE.Vector3(params.x, params.y, params.z));
        return Math.min(fireDist, waterDist) < (params.radius || 5);
        
      case 'buttonPressed':
        return physics.buttons.some(b => b.pressed);
        
      case 'bothButtonsPressed':
        return physics.buttons.length >= 2 && physics.buttons.every(b => b.pressed);
        
      case 'playerPastX':
        return (playerFire.mesh.position.x > params.x || playerWater.mesh.position.x > params.x);
        
      default:
        return true;
    }
  }

  update(playerFire, playerWater, physics) {
    const vector = new THREE.Vector3();
    
    this.textElements.forEach(textData => {
      const { id, element, position, condition, shown } = textData;
      
      // Check if condition is met (or if no condition, show immediately)
      const shouldShow = !shown && this.checkCondition(condition, playerFire, playerWater, physics);
      
      if (shouldShow) {
        textData.shown = true;
        this.shownTexts.add(id);
      }
      
      // Update visibility and position
      if (textData.shown) {
        // Convert 3D position to screen coordinates
        vector.set(position.x, position.y, position.z);
        vector.project(this.camera);
        
        // Only show if in front of camera
        if (vector.z > -1 && vector.z < 1) {
          const x = (vector.x * 0.5 + 0.5) * this.renderer.domElement.clientWidth;
          const y = (-vector.y * 0.5 + 0.5) * this.renderer.domElement.clientHeight;
          
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;
          element.style.transform = 'translate(-50%, -50%) scale(1)';
          element.style.opacity = '1';
        } else {
          element.style.opacity = '0';
        }
      } else {
        element.style.opacity = '0';
      }
    });
  }

  clear() {
    this.textElements.forEach(textData => {
      if (textData.element.parentNode) {
        textData.element.parentNode.removeChild(textData.element);
      }
    });
    this.textElements = [];
    this.shownTexts.clear();
  }

  setupLevel1(playerFire, playerWater, physics) {
    this.clear();
    
    // Text near spawn - Goal explanation (show immediately)
    this.createText(
      'goal',
      'GOAL: Both players must reach their matching colored doors at the same time to complete the level!',
      new THREE.Vector3(-27, 4, 0),
      null, // Show immediately
      '#ffff00',
      '20px'
    );
    
    // Text below fire pool
    this.createText(
      'fire-kills-water',
      'DANGER: This is LAVA - Fireboy is safe here, but Watergirl will DIE if she touches it!',
      new THREE.Vector3(-21, -2.5, 0),
      { type: 'anyPlayerNear', x: -21, y: 0, z: 0, radius: 6 },
      '#ff4444',
      '18px'
    );
    
    // Text below water pool
    this.createText(
      'water-kills-fire',
      'DANGER: This is WATER - Watergirl is safe here, but Fireboy will DIE if he touches it!',
      new THREE.Vector3(-15, -4, 0),
      { type: 'anyPlayerNear', x: -15, y: 0, z: 0, radius: 6 },
      '#4488ff',
      '18px'
    );
    
    // Text above acid pool
    this.createText(
      'acid-kills-both',
      'EXTREME DANGER: This GREEN ACID is deadly to BOTH players! Avoid it at all costs!',
      new THREE.Vector3(-6, -2, 0),
      { type: 'anyPlayerNear', x: -6, y: 0, z: 0, radius: 5 },
      '#00ff00',
      '18px'
    );
    
    // Text when first button is pressed
    this.createText(
      'button-explanation',
      'TIP: Stand on the YELLOW pressure plates to activate them! They open doors and control mechanisms when held down.',
      new THREE.Vector3(-2, 4, 0),
      { type: 'buttonPressed' },
      '#ffff00',
      '18px'
    );
    
    // Text near box when second button is reached
    this.createText(
      'box-explanation',
      'INTERACTIVE: You can PUSH and CARRY these brown boxes! Use them to hold down buttons or create platforms. Press E (Fireboy) or Space (Watergirl) to pick up!',
      new THREE.Vector3(9, -2, 0),
      { type: 'anyPlayerNear', x: 6, y: 0.1, z: 0, radius: 4 },
      '#ffaa00',
      '18px'
    );
    
    // Text near moving platform explaining levers
    this.createText(
      'lever-explanation',
      'MECHANISM: LEVERS lets platforms move up and down! Work together to reach higher areas!',
      new THREE.Vector3(24, 6, 0),
      { type: 'anyPlayerNear', x: 15, y: 6, z: 0, radius: 4 },
      '#ffaa00',
      '18px'
    );
  }
}

