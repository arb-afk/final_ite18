export const Level2 = {
  name: "Cooperation!",
  type: "Maze Vertical",
  
  start: {
    fire: [-10, 1, 0],
    water: [-8.5, 5, 0]
  },

  blocks: [
    // === FLOORS (corridors) ===
    // Floor 1 
    { x: -7.5, y: 0, z: 0, w: 11, h: 1, d: 4, type: 'solid' }, // Left of lava
    { x: 0, y: -0.5, z: 0, w: 4, h: 2, d: 6, type: 'pool', poolType: 'lava' }, // Lava pool
    { x: 3.5,  y: 0, z: 0, w: 3, h: 1, d: 4, type: 'solid' }, // Right of lava

    { x: 7, y: -0.5, z: 0, w: 4, h: 2, d: 6, type: 'pool', poolType: 'water' }, // Water pool
    { x: 11,  y: 0, z: 0, w: 4, h: 1, d: 4, type: 'solid' }, // Right of water

    // Floor 1 half (where watergirl spawns)
    { x: -9.5, y: 4,  z: 0, w: 8, h: 1, d: 4, type: 'solid' },




    // Floor 2 
    { x: 5, y: 8, z: 0, w: 6, h: 1, d: 4, type: 'solid' }, // Right of acid
    { x: 0, y: 7.5, z: 0, w: 4, h: 2, d: 6, type: 'pool', poolType: 'acid' }, // acid
    { x: -3.5, y: 8, z: 0, w: 3, h: 1, d: 4, type: 'solid' }, // Left of acid
    { x: -5.2, y: 8.5, z: 0, w: 0.5, h: 2, d: 4, type: 'solid' }, // step-up
    { x: -8.9, y: 9, z: 0, w: 7, h: 1, d: 4, type: 'solid' }, // step-up end to the left

    // Floor 3
    { x: -2, y: 13, z: 0, w: 10, h: 1, d: 4, type: 'solid' }, 
    { x: 0, y: 14, z: 0, w: 6, h: 1, d: 4, type: 'solid' }, 
    { x: 7, y: 12, z: 0, w: 10, h: 1, d: 4, type: 'solid' }, 


    // Floor 4
    { x: -4, y: 17, z: 0, w: 19, h: 1, d: 4, type: 'solid' }, 
    { x: 5.6, y: 16.5, z: 0, w: 0.5, h: 2, d: 4, type: 'solid' }, // step-down
    { x: 7.35, y: 15.5, z: 0, w: 4, h: 0.5, d: 4, type: 'solid' }, // ledge

    // SIDE WALLS 
    { x: -13, y: 8, z: 0, w: 2, h: 20, d: 4, type: 'solid' },
    { x:  13, y: 8, z: 0, w: 2, h: 20, d: 4, type: 'solid' },

  ],

  levers: [
    // lever to control platform to go to floor 3
    { x: -6.3, y: 10.7, z: 0, w: 0.8, h: 2.5, d: 1, links: ['platform2'], startActive: false }
  ],

  buttons: [
    {
      x: 3.5, y: 0.6, z: 0, 
      w: 2, h: 0.2, d: 2, 
      links: ['platform1'] // First plate on first floor
    },
    {
      x: 6, y: 8.6, z: 0, 
      w: 2, h: 0.2, d: 2, 
      links: ['platform1'] // Second plate on second floor
    }
  ],

  moving: [
    { 
      id: 'platform1',
      start: [10.3, 8, 0],      // Top position (Start) goes to second floor
      end: [10.3, 1, 0],        // Bottom position (End)
      w: 2.5, h: 0.5, d: 4, 
      speed: 0.03, 
      active: false,
      startAtEnd: false
    },
    {
      id: 'platform2',
      start: [-10, 11.5, 0],      // Top position (Start) goes to second floor
      end: [-10, 10, 0],        // Bottom position (End)
      w: 2.5, h: 0.5, d: 4, 
      speed: 0.03, 
      active: false,
      startAtEnd: false
    }
  ],
  pushable: [
    // Box on floor 3 to get to floor 4
    { x: -2, y: 15, z: 0, w: 1.5, h: 1.5, d: 1.5}
  ],

  gems: [
    { x: 3.5, y: 1.5, z: 0, type: 'gem_water' }, // on first plate on first floor
    { x: 6, y: 9.5, z: 0, type: 'gem_fire' }, // on second plate on second floor  
    { x: 1, y: 9.5, z: 0, type: 'gem_water' }, // floating on top of acid pool
    { x: -1, y: 9.5, z: 0, type: 'gem_fire' }, // floating on top of acid pool
    { x: 0, y: 15.5, z: 0, type: 'gem_water' }, // on floor 3 near box 
    { x: 8, y: 16.5, z: 0, type: 'gem_fire' }, // on floor 4 near ledge
  ],


  goals: [
    { x: -4, y: 18.5, z: 0, type: 'goal_fire' },
    { x: -2, y: 18.5, z: 0, type: 'goal_water' }
  ]
};