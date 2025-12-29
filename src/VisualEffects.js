import * as THREE from 'three';

export class VisualEffects {
  constructor(scene) {
    this.scene = scene;
    this.animatedMeshes = [];
  }

  update(time) {
    for (const mesh of this.animatedMeshes) {
      if (mesh.userData.isLiquid) {
        this.animateLiquid(mesh, time);
      }
    }
  }

  createPool(x, y, z, width, depth, type) {
    const basinColor = 0x5a5a3a;
    let liquidColor, emissiveColor, glowColor;

    if (type === 'lava') {
      liquidColor = 0xff3300; emissiveColor = 0xaa0000; glowColor = 0xff3300;
    } else if (type === 'water') {
      liquidColor = 0x3366ff; emissiveColor = 0x003366; glowColor = 0x3366ff;
    } else if (type === 'acid') {
      liquidColor = 0x00ff00; emissiveColor = 0x004400; glowColor = 0x00ff00;
    }

    // 1. Jagged Basin
    const basin = this.createJaggedBasin({
      x, y, z, width: width + 0.4, depth: depth + 0.4, color: basinColor
    });
    this.scene.add(basin);

    // 2. Liquid Surface
    const surface = this.createLiquidSurface({
      x, y: y + 0.02, z, width: width - 0.2, depth: depth - 0.2, 
      color: liquidColor, emissive: emissiveColor
    });
    this.scene.add(surface);
    this.animatedMeshes.push(surface);

    // 3. Glow Light
    const glow = new THREE.PointLight(glowColor, 0.6, 6);
    glow.position.set(x, y + 0.5, z);
    this.scene.add(glow);

    return [basin, surface, glow];
  }

  createJaggedBasin({ x, y, z, width, depth, height = 1, color }) {
    const halfW = width / 2;

    const shape = new THREE.Shape();
    // A slightly random jagged profile for the top
    shape.moveTo(-halfW, 0);
    shape.lineTo(-halfW + 0.4, 0.15); // dip up
    shape.lineTo(-halfW + 1.2, 0.05); // dip down
    shape.lineTo(0, 0.25);            // peak
    shape.lineTo(halfW - 1.1, 0.1);
    shape.lineTo(halfW - 0.3, 0.2);
    shape.lineTo(halfW, 0);
    shape.lineTo(halfW, -height);
    shape.lineTo(-halfW, -height);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: false
    });
    
    // Center geometry on Z
    geo.translate(0, 0, -depth / 2);

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.95,
      metalness: 0
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  createLiquidSurface({ x, y, z, width, depth, color, emissive }) {
    const geo = new THREE.PlaneGeometry(width, depth, 12, 8); // Reduced resolution slightly for performance
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.userData.waveOffset = Math.random() * 100;
    mesh.userData.isLiquid = true;

    return mesh;
  }

  animateLiquid(mesh, time) {
    const pos = mesh.geometry.attributes.position;
    const offset = mesh.userData.waveOffset;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // PlaneGeometry Y maps to depth in Z
      // Gentle wave formula
      pos.setZ(
        i,
        Math.sin(time * 0.002 + x * 2 + z * 2 + offset) * 0.05
      );
    }

    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
}