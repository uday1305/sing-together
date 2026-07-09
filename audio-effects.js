// audio-effects.js - Web Audio API Core for Karaoke Processing
class KaraokeAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.micStream = null;
    this.micSource = null;
    
    // Audio nodes
    this.reverbNode = null;
    this.delayNode = null;
    this.delayGain = null;
    this.lowCutFilter = null;
    this.vocalGain = null;
    this.synthGain = null;
    this.masterGain = null;
    this.analyserNode = null;
    
    // Mixing & Recording
    this.mixerDest = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    
    // Synth sequencer state
    this.isPlaying = false;
    this.currentSong = null;
    this.startTime = 0;
    this.pauseTime = 0;
    this.scheduledNotes = [];
    this.activeOscillators = [];
    this.timerId = null;
    this.nextNoteIndex = 0;
    this.nextChordIndex = 0;
    this.lookAheadTime = 0.2; // How far ahead to schedule (seconds)
    this.scheduleInterval = 50; // How often to run schedule loop (ms)
    
    // Pitch detection configuration
    this.pitchAnalyser = null;
    this.pitchBuffer = null;

    // Remote Peer Audio Nodes (Multiplayer)
    this.remoteSource = null;
    this.remoteGain = null;
  }

  async init() {
    if (this.audioCtx) return;
    
    // Create audio context optimized for low-latency live interactive performance (like Zoom)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    
    // Main components
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.audioCtx.destination);
    
    // Vocal node chain
    this.vocalGain = this.audioCtx.createGain();
    this.vocalGain.gain.value = 1.0;
    
    this.lowCutFilter = this.audioCtx.createBiquadFilter();
    this.lowCutFilter.type = 'highpass';
    this.lowCutFilter.frequency.value = 80; // Cut low rumble/pop noise

    // Create reverb node (procedurally generated impulse response)
    this.reverbNode = this.audioCtx.createConvolver();
    this.reverbNode.buffer = this.createReverbBuffer(2.0, 3.5); // 2 second hall, 3.5 decay factor
    this.reverbGain = this.audioCtx.createGain();
    this.reverbGain.gain.value = 0.0; // Controlled by presets

    // Create delay/echo nodes
    this.delayNode = this.audioCtx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.3; // 300ms echo
    this.delayGain = this.audioCtx.createGain();
    this.delayGain.gain.value = 0.0; // Echo feedback gain
    
    // Connect echo loop
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.delayNode);

    // Vocal analyser for live feedback
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 512;

    // Pitch analyser for the pitch detection
    this.pitchAnalyser = this.audioCtx.createAnalyser();
    this.pitchAnalyser.fftSize = 2048;
    this.pitchBuffer = new Float32Array(this.pitchAnalyser.fftSize);

    // Connect Vocal Chain
    // micSource -> lowCutFilter -> vocalGain -> reverbNode -> reverbGain -> mixerDest
    //                           -> vocalGain -> delayNode -> delayGain -> mixerDest
    //                           -> vocalGain -> masterGain / analysers
    this.lowCutFilter.connect(this.vocalGain);
    
    // Vocal outputs to effects
    this.vocalGain.connect(this.reverbNode);
    this.reverbNode.connect(this.reverbGain);
    
    this.vocalGain.connect(this.delayNode);
    this.vocalGain.connect(this.analyserNode);
    this.vocalGain.connect(this.pitchAnalyser);

    // Backing track synth node
    this.synthGain = this.audioCtx.createGain();
    this.synthGain.gain.value = 0.7; // Lower background track slightly
    
    // Setup Mixer Destination (for recording)
    this.mixerDest = this.audioCtx.createMediaStreamDestination();
    
    // Direct dry vocal path to mixer & speakers
    this.vocalGain.connect(this.masterGain);
    this.vocalGain.connect(this.mixerDest);
    
    // Reverb and Echo pathways to mixer & speakers
    this.reverbGain.connect(this.masterGain);
    this.reverbGain.connect(this.mixerDest);
    this.delayGain.connect(this.masterGain);
    this.delayGain.connect(this.mixerDest);
    
    // Backing track pathway to mixer & speakers
    this.synthGain.connect(this.masterGain);
    this.synthGain.connect(this.mixerDest);
  }

  // Create standard procedural white-noise convolution reverb
  createReverbBuffer(duration, decay) {
    const sampleRate = 44100;
    const length = sampleRate * duration;
    // Temporary AudioContext if this.audioCtx doesn't exist yet
    const ctx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const percent = i / length;
      const decayFactor = Math.exp(-percent * decay);
      left[i] = (Math.random() * 2 - 1) * decayFactor;
      right[i] = (Math.random() * 2 - 1) * decayFactor;
    }
    return impulse;
  }

  async startMic() {
    await this.init();
    if (this.micStream) return;
    
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Turn off browser's auto cancellation for higher music fidelity
          noiseSuppression: true,
          autoGainControl: false
        }
      });
      
      this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.lowCutFilter);
    } catch (err) {
      console.error('Failed to access microphone:', err);
      throw err;
    }
  }

  stopMic() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
  }

  addRemoteStream(stream) {
    if (!this.audioCtx) return;
    if (!stream || stream.getAudioTracks().length === 0) {
      console.log("No remote audio tracks yet. Delaying Web Audio context binding.");
      return;
    }
    this.removeRemoteStream();
    
    this.remoteSource = this.audioCtx.createMediaStreamSource(stream);
    this.remoteGain = this.audioCtx.createGain();
    this.remoteGain.gain.value = 1.0;
    
    this.remoteSource.connect(this.remoteGain);
    this.remoteGain.connect(this.masterGain);
    this.remoteGain.connect(this.mixerDest);
    console.log("Remote peer audio stream added to local audio context.");
  }

  removeRemoteStream() {
    if (this.remoteSource) {
      this.remoteSource.disconnect();
      this.remoteSource = null;
    }
    if (this.remoteGain) {
      this.remoteGain.disconnect();
      this.remoteGain = null;
    }
  }

  setRemoteVolume(volume) {
    if (this.remoteGain) {
      this.remoteGain.gain.value = parseFloat(volume);
    }
  }

  setPreset(presetName) {
    if (!this.audioCtx) return;
    
    // Reset defaults
    this.reverbGain.gain.value = 0.0;
    this.delayGain.gain.value = 0.0;
    this.delayNode.delayTime.value = 0.3;
    
    switch (presetName) {
      case 'studio':
        this.reverbGain.gain.value = 0.25;
        this.delayGain.gain.value = 0.08;
        this.delayNode.delayTime.value = 0.15; // fast tight delay
        break;
      case 'hall':
        this.reverbGain.gain.value = 0.55;
        this.delayGain.gain.value = 0.15;
        this.delayNode.delayTime.value = 0.4; // wider echo
        break;
      case 'echo':
        this.reverbGain.gain.value = 0.1;
        this.delayGain.gain.value = 0.45; // intense feedback echo
        this.delayNode.delayTime.value = 0.35;
        break;
      case 'robot':
        this.reverbGain.gain.value = 0.3;
        this.delayGain.gain.value = 0.3;
        this.delayNode.delayTime.value = 0.05; // metallic short ring delay
        break;
      case 'clean':
      default:
        // Everything zeroed
        break;
    }
    console.log(`Vocal effect preset changed to: ${presetName}`);
  }

  setVocalVolume(volume) {
    if (this.vocalGain) {
      this.vocalGain.gain.value = parseFloat(volume);
    }
  }

  setSynthVolume(volume) {
    if (this.synthGain) {
      this.synthGain.gain.value = parseFloat(volume) * 0.7; // Cap backing track
    }
  }

  // MIDI Synthesizer scheduling loop
  playSong(song) {
    this.currentSong = song;
    this.isPlaying = true;
    this.nextNoteIndex = 0;
    this.nextChordIndex = 0;
    this.activeOscillators = [];
    
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    this.startTime = this.audioCtx.currentTime - this.pauseTime;
    
    // Start scheduler
    this.timerId = setInterval(() => this.scheduler(), this.scheduleInterval);
  }

  pauseSong() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    clearInterval(this.timerId);
    this.timerId = null;
    this.pauseTime = this.audioCtx.currentTime - this.startTime;
    
    // Stop all playing oscillators
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.activeOscillators = [];
  }

  stopSong() {
    this.isPlaying = false;
    clearInterval(this.timerId);
    this.timerId = null;
    this.pauseTime = 0;
    this.nextNoteIndex = 0;
    this.nextChordIndex = 0;
    
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.activeOscillators = [];
    this.currentSong = null;
  }

  getCurrentPlayTime() {
    if (!this.isPlaying) return this.pauseTime;
    return this.audioCtx.currentTime - this.startTime;
  }

  scheduler() {
    const currentTime = this.audioCtx.currentTime;
    const songTime = currentTime - this.startTime;
    
    const notes = this.currentSong.synthData.notes;
    const chords = this.currentSong.synthData.chords || [];
    
    // Schedule melody notes
    while (this.nextNoteIndex < notes.length && notes[this.nextNoteIndex].time < songTime + this.lookAheadTime) {
      const note = notes[this.nextNoteIndex];
      const scheduleTime = this.startTime + note.time;
      // Only schedule if note is in the future
      if (scheduleTime >= currentTime) {
        this.playMelodyNote(note.pitch, scheduleTime, note.duration);
      }
      this.nextNoteIndex++;
    }

    // Schedule backing chords
    while (this.nextChordIndex < chords.length && chords[this.nextChordIndex].time < songTime + this.lookAheadTime) {
      const chord = chords[this.nextChordIndex];
      const scheduleTime = this.startTime + chord.time;
      if (scheduleTime >= currentTime) {
        this.playChord(chord.notes, scheduleTime, chord.duration);
      }
      this.nextChordIndex++;
    }
    
    // End of song check
    const totalDuration = this.getSongDuration();
    if (songTime >= totalDuration && notes.length > 0 && this.nextNoteIndex >= notes.length) {
      this.stopSong();
      if (this.onSongEndCallback) this.onSongEndCallback();
    }
  }

  getSongDuration() {
    if (!this.currentSong) return 0;
    const notes = this.currentSong.synthData.notes;
    if (notes.length === 0) return 0;
    const lastNote = notes[notes.length - 1];
    return lastNote.time + lastNote.duration + 1.0; // padding
  }

  playMelodyNote(pitch, time, duration) {
    const freq = window.noteToFreq(pitch);
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    // Lead instrument sound (Triangular wave, clean and soft)
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    
    // Envelope
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.25, time + 0.05); // Attack
    gainNode.gain.setValueAtTime(0.25, time + duration - 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration); // Decay
    
    osc.connect(gainNode);
    gainNode.connect(this.synthGain);
    
    osc.start(time);
    osc.stop(time + duration);
    
    this.activeOscillators.push(osc);
    
    // Clean up oscillator array when done
    setTimeout(() => {
      this.activeOscillators = this.activeOscillators.filter(item => item !== osc);
    }, (time + duration - this.audioCtx.currentTime) * 1000 + 100);
  }

  playChord(pitches, time, duration) {
    // Generate soft synthesizer pad backing chords
    const oscs = [];
    const chordGain = this.audioCtx.createGain();
    
    chordGain.gain.setValueAtTime(0, time);
    chordGain.gain.linearRampToValueAtTime(0.08, time + 0.2); // Soft slow attack
    chordGain.gain.setValueAtTime(0.08, time + duration - 0.1);
    chordGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    pitches.forEach(pitch => {
      const freq = window.noteToFreq(pitch);
      const osc = this.audioCtx.createOscillator();
      osc.type = 'sawtooth'; // Sawtooth but heavily filtered for a rich pad sound
      osc.frequency.setValueAtTime(freq, time);
      
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, time); // warm low-pass filter
      
      osc.connect(filter);
      filter.connect(chordGain);
      oscs.push(osc);
      
      osc.start(time);
      osc.stop(time + duration);
      this.activeOscillators.push(osc);
    });

    chordGain.connect(this.synthGain);

    setTimeout(() => {
      this.activeOscillators = this.activeOscillators.filter(item => !oscs.includes(item));
    }, (time + duration - this.audioCtx.currentTime) * 1000 + 100);
  }

  // Real-time Pitch Detection (Autocorrelation)
  detectPitch() {
    if (!this.pitchAnalyser || !this.isPlaying) return null;
    
    this.pitchAnalyser.getFloatTimeDomainData(this.pitchBuffer);
    const sampleRate = this.audioCtx.sampleRate;
    
    // Autocorrelation algorithm (YIN-like simple implementation)
    const bufferSize = this.pitchBuffer.length;
    let rms = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      rms += this.pitchBuffer[i] * this.pitchBuffer[i];
    }
    rms = Math.sqrt(rms / bufferSize);
    
    if (rms < 0.008) return null; // Signal is too quiet to track
    
    let r1 = 0, r2 = bufferSize - 1;
    const thres = 0.2;
    
    // Find clipping range
    for (let i = 0; i < bufferSize / 2; i++) {
      if (Math.abs(this.pitchBuffer[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = bufferSize - 1; i >= bufferSize / 2; i--) {
      if (Math.abs(this.pitchBuffer[i]) < thres) {
        r2 = i;
        break;
      }
    }
    
    const buf = this.pitchBuffer.subarray(r1, r2);
    const len = buf.length;
    
    let bestOffset = -1;
    let bestCorrelation = 0;
    
    const correlations = new Float32Array(len);
    
    for (let offset = 0; offset < len; offset++) {
      let corr = 0;
      for (let i = 0; i < len - offset; i++) {
        corr += buf[i] * buf[i + offset];
      }
      correlations[offset] = corr;
    }
    
    // Find the first peak that is significantly high
    let peakIndex = -1;
    for (let i = 1; i < len - 1; i++) {
      if (correlations[i] > correlations[i-1] && correlations[i] > correlations[i+1]) {
        // peak
        if (peakIndex === -1 || correlations[i] > correlations[peakIndex]) {
          peakIndex = i;
        }
      }
    }
    
    if (peakIndex !== -1) {
      const frequency = sampleRate / peakIndex;
      // Limit to normal singing ranges (70Hz - 1000Hz)
      if (frequency >= 70 && frequency <= 1000) {
        return {
          frequency: frequency,
          note: this.freqToNote(frequency),
          cents: this.freqToCentsOffset(frequency)
        };
      }
    }
    return null;
  }

  // Pitch calculation helpers
  freqToNote(frequency) {
    const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const formulaVal = 12 * (Math.log(frequency / 440) / Math.log(2));
    const noteIndex = Math.round(formulaVal) + 69;
    const noteName = noteStrings[noteIndex % 12];
    const octave = Math.floor(noteIndex / 12) - 1;
    return `${noteName}${octave}`;
  }

  freqToCentsOffset(frequency) {
    const formulaVal = 12 * (Math.log(frequency / 440) / Math.log(2));
    const noteIndex = Math.round(formulaVal) + 69;
    const expectedFreq = 440 * Math.pow(2, (noteIndex - 69) / 12);
    return Math.floor(1200 * Math.log(frequency / expectedFreq) / Math.log(2));
  }

  // Recording
  startRecording() {
    this.recordedChunks = [];
    
    // Choose standard container format supported by the browser
    let options = { mimeType: 'audio/webm;codecs=opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'audio/ogg;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: '' }; // fallback
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.mixerDest.stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log("Recording stopped. Generating Blob.");
      };

      this.mediaRecorder.start(100); // chunk every 100ms
      console.log("Recording started successfully");
    } catch(err) {
      console.error("Failed to create MediaRecorder:", err);
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const finalBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        resolve(finalBlob);
      };
      
      this.mediaRecorder.stop();
      console.log("Recording stopped.");
    });
  }
}

// Export engine globally
window.audioEngine = new KaraokeAudioEngine();
