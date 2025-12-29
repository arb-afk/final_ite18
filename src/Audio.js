export class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Low volume by default
    this.masterGain.connect(this.ctx.destination);
    
    this.bgmSource = null;
    this.bgmBuffer = null;
    this.isPlaying = false;
    this.loadBackgroundMusic();
  }

  async loadBackgroundMusic() {
    try {
      // URL encode the filename to handle spaces and special characters
      const filename = encodeURIComponent('Coding Stupor ~ video game music to help you focus [yA41iunMG6A].mp3');
      
      // Try different paths (Vite serves public/ at root, so public/assets/ = /assets/)
      const paths = [
        `/assets/${filename}`,  // Production/Vercel (from public/assets/)
        `./assets/${filename}`, // Relative path fallback
        `assets/${filename}`    // Another fallback
      ];
      
      let response = null;
      let lastError = null;
      let usedPath = null;
      
      for (const path of paths) {
        try {
          console.log('Trying to load music from:', path);
          response = await fetch(path);
          if (response.ok) {
            usedPath = path;
            break;
          } else {
            console.log(`Path ${path} returned ${response.status}`);
          }
        } catch (err) {
          lastError = err;
          console.log(`Path ${path} failed:`, err);
          continue;
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Failed to fetch music from all paths. Last error: ${lastError?.message || response?.status} ${response?.statusText || ''}`);
      }
      
      console.log(`Music file fetched successfully from: ${usedPath}`);
      console.log('Decoding audio data...');
      const arrayBuffer = await response.arrayBuffer();
      this.bgmBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      console.log('Background music loaded successfully, buffer size:', this.bgmBuffer.length, 'samples');
    } catch (error) {
      console.error('Failed to load background music:', error);
    }
  }

  async resume() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  playJump() {
    this.playTone(400, 'square', 0.1, 0);
    this.playTone(600, 'square', 0.1, 0.05);
  }

  playDeath() {
    this.playTone(150, 'sawtooth', 0.1, 0);
    this.playTone(100, 'sawtooth', 0.2, 0.1);
    this.playTone(50, 'sawtooth', 0.4, 0.2);
  }

  playButton() {
    this.playTone(800, 'sine', 0.1, 0);
  }

  playGoal() {
    this.playTone(600, 'sine', 0.1, 0);
    this.playTone(800, 'sine', 0.2, 0.1);
    this.playTone(1200, 'sine', 0.4, 0.2);
  }

  playLevelSelect() {
    this.playTone(523, 'sine', 0.08, 0);     // C5
    this.playTone(659, 'sine', 0.08, 0.08);  // E5
    this.playTone(784, 'sine', 0.15, 0.16);  // G5
  }

  playTone(freq, type, duration, delay = 0) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(this.ctx.currentTime + delay);
    osc.stop(this.ctx.currentTime + delay + duration);
  }

  async startMusic() {
    console.log('startMusic called. isPlaying:', this.isPlaying, 'bgmBuffer:', !!this.bgmBuffer);
    
    // Ensure audio context is resumed
    if (this.ctx.state === 'suspended') {
      console.log('Resuming audio context...');
      await this.ctx.resume();
    }
    
    if (this.isPlaying) {
      console.log('Music already playing, skipping');
      return;
    }
    
    if (!this.bgmBuffer) {
      console.log('Music buffer not loaded yet, waiting...');
      // Wait for buffer to load
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (this.bgmBuffer) {
          console.log('Music buffer loaded after waiting');
          break;
        }
      }
      if (!this.bgmBuffer) {
        console.warn('Music buffer still not available after waiting');
        return;
      }
    }
    
    this.isPlaying = true;
    
    try {
      // Create audio source from buffer
      this.bgmSource = this.ctx.createBufferSource();
      this.bgmSource.buffer = this.bgmBuffer;
      this.bgmSource.loop = true; // Loop the music
      
      // Create gain node for music volume
      const musicGain = this.ctx.createGain();
      musicGain.gain.value = 0.4; // Adjust music volume
      
      this.bgmSource.connect(musicGain);
      musicGain.connect(this.masterGain);
      
      this.bgmSource.start(0);
      console.log('Music started successfully');
    } catch (error) {
      console.error('Error starting music:', error);
      this.isPlaying = false;
    }
  }

  stopMusic() {
    if (this.bgmSource) {
      this.bgmSource.stop();
      this.bgmSource = null;
    }
    this.isPlaying = false;
  }
}