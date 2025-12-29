export const Level1 = {
  name: "Training Ground",
  type: "Tutorial",
  start: { fire: [-28, 2, 0], water: [-26, 2, 0] },
  blocks: [
    // Starting Area
    // Ground - Split into 3 sections with gaps for pools
    { x: -26, y: -1.05, z: 0, w: 6, h: 2.1, d: 6, type: 'solid' },
    { x: -18, y: -1.05, z: 0, w: 2, h: 2.1, d: 6, type: 'solid' }, 
    { x: -10.5, y: -1.05, z: 0, w: 5, h: 2.1, d: 6, type: 'solid' },


    // Lava pool
    { x: -21, y: -1.05, z: 0, w: 4, h: 2.1, d: 6, type: 'pool', poolType: 'lava' },
    // Water pool
    { x: -15, y: -1.05, z: 0, w: 4, h: 2.1, d: 6, type: 'pool', poolType: 'water' },

    // Acid pool
    { x: -6, y: -1.05, z: 0, w: 4, h: 2.1, d: 6, type: 'pool', poolType: 'acid' },

    { x: 8, y: -1.05, z: 0, w: 24, h: 2.1, d: 6, type: 'solid' }, // Right section

    // Door
    { x: 2, y: 2, z: 0, w: 1, h: 5, d: 4, type: 'door', id: 'door1' },
    

    { x: 17, y: 1, z: 0, w: 6, h: 5, d: 6, type: 'solid' }, // Platform for box



    { x: 10, y: 8, z: 0, w: 6, h: 1, d: 6, type: 'solid' },
  ],
  buttons: [  
    // Button for Door
    { x: -2, y: 0.1, z: 0, w: 2, h: 0.2, d: 2, links: ['door1'] },
    { x: 6, y: 0.1, z: 0, w: 2, h: 0.2, d: 2, links: ['door1'] }
  ],
  levers: [
    // Lever that controls moving platform
    { x: 19, y: 4.8, z: 0, w: 0.8, h: 2.5, d: 1, links: ['platform1'], startActive: false },
    { x: 12, y: 9.7, z: 0, w: 0.8, h: 2.5, d: 1, links: ['platform1'], startActive: false }
  ],
  pushable: [
    // Box to hold button
    { x: 9, y: 0, z: 0, w: 1.5, h: 1.5, d: 1.5}
  ],
  gems: [
    { x: 6, y: 1.5, z: 0, type: 'gem_fire' },
    { x: 10, y: 3, z: 0, type: 'gem_water' }
  ],
  moving: [
    // Moving platform controlled by lever (goes up and down)
    { 
      id: 'platform1',
      start: [15, 8, 0],      // Top position (Start)
      end: [15, 4, 0],        // Bottom position (End)
      w: 3, h: 0.5, d: 4, 
      speed: 0.03, 
      active: false,
      startAtEnd: false
    }
  ],

  goals: [
    { x: 8, y: 9.5, z: 0, type: 'goal_fire' },
    { x: 10, y: 9.5, z: 0, type: 'goal_water' }
  ]
};