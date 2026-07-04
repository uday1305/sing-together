// app.js - Application logic and UI controller
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let currentScreen = 'home';
  let activeSong = null;
  let activeSingingMode = 'solo'; // 'solo', 'duet-part-a', 'duet-part-b'
  let customSongs = [];
  let isRecording = false;
  let micActive = false;
  
  // Scoring state
  let totalPitchTicks = 0;
  let matchPitchTicks = 0;
  let currentRecordingBlob = null;
  
  // Animation frames & loop trackers
  let visualizerFrameId = null;
  let pitchTrackerFrameId = null;

  // WebSockets & WebRTC Multiplayer State
  let socket = null;
  let peer = null; // Holds the active RTCPeerConnection instance
  let conn = null; // Mock conn data relay channel object
  let mediaCall = null; // Mock mediaCall object
  let isHost = false;
  let remotePeerId = null;
  let remoteStream = null;
  let remoteUserPitch = null;
  let localMediaStream = null;
  let activeRoomName = null;
  let remotePartnerUsername = null;

  // DOM Elements
  const screens = {
    home: document.getElementById('screen-home'),
    studio: document.getElementById('screen-studio'),
    gallery: document.getElementById('screen-gallery'),
    live: document.getElementById('screen-live')
  };

  const navBtns = {
    home: document.getElementById('nav-home'),
    gallery: document.getElementById('nav-gallery'),
    live: document.getElementById('nav-live')
  };

  const songsContainer = document.getElementById('songs-container');
  const recordingsContainer = document.getElementById('recordings-container');
  const searchInput = document.getElementById('song-search');
  const filterBtns = document.querySelectorAll('.tab-btn');

  // Live Room DOM Elements
  const btnHostRoom = document.getElementById('btn-host-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const btnCopyRoomId = document.getElementById('btn-copy-room-id');
  const btnDisconnectLive = document.getElementById('btn-disconnect-live');
  const hostCodeDisplay = document.getElementById('host-code-display');
  const lblRoomId = document.getElementById('lbl-room-id');
  const inputRoomId = document.getElementById('input-room-id');
  const liveConnectionBoard = document.getElementById('live-connection-board');
  const lblConnectionStatus = document.getElementById('lbl-connection-status');
  const lblPeerDetails = document.getElementById('lbl-peer-details');
  const connectionStatusDot = document.getElementById('connection-status-dot');

  const btnQuickMatch = document.getElementById('btn-quick-match');
  const btnCancelMatch = document.getElementById('btn-cancel-match');
  const matchmakingStatusContainer = document.getElementById('matchmaking-status-container');
  const lblMatchmakingText = document.getElementById('lbl-matchmaking-text');
  const togglePrivateRoomHeader = document.getElementById('toggle-private-room-header');
  const privateRoomLayout = document.getElementById('private-room-layout');
  const privateRoomArrow = document.getElementById('private-room-arrow');

  // Auth UI DOM elements
  const screenAuth = document.getElementById('screen-auth');
  const loginFormContainer = document.getElementById('login-form-container');
  const signupFormContainer = document.getElementById('signup-form-container');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const linkGotoSignup = document.getElementById('link-goto-signup');
  const linkGotoLogin = document.getElementById('link-goto-login');
  const authFeedback = document.getElementById('auth-feedback');
  
  const headerNav = document.getElementById('header-nav');
  const userProfileDisplay = document.getElementById('user-profile-display');
  const lblUsername = document.getElementById('lbl-username');
  const btnLogout = document.getElementById('btn-logout');
  
  // Studio UI Elements
  const studioSongTitle = document.getElementById('studio-song-title');
  const studioSongArtist = document.getElementById('studio-song-artist');
  const studioModeBadge = document.getElementById('studio-mode-badge');
  const lyricsContainer = document.getElementById('lyrics-container');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  const progressFill = document.getElementById('progress-fill');
  const progressTimeline = document.getElementById('progress-timeline');
  const visualizerCanvas = document.getElementById('visualizer-canvas');
  const pitchCanvas = document.getElementById('pitch-canvas');
  
  // Studio Buttons
  const btnRecordMain = document.getElementById('btn-record-main');
  const btnStudioFinish = document.getElementById('btn-studio-finish');
  const btnStudioExit = document.getElementById('btn-studio-exit');
  
  // Mix Panel
  const sliderVocalVolume = document.getElementById('slider-vocal-volume');
  const sliderBackingVolume = document.getElementById('slider-backing-volume');
  const labelVocalVol = document.getElementById('label-vocal-vol');
  const labelBackingVol = document.getElementById('label-backing-vol');
  const fxBtns = document.querySelectorAll('.fx-btn');

  // Modals
  const modalDuetPicker = document.getElementById('modal-duet-picker');
  const modalUpload = document.getElementById('modal-upload');
  const modalSaveReview = document.getElementById('modal-save-review');
  const btnTriggerUpload = document.getElementById('btn-trigger-upload');
  
  // Form/Modal buttons
  const uploadForm = document.getElementById('upload-track-form');
  const btnCloseDuet = document.getElementById('btn-close-duet');
  const btnCloseUpload = document.getElementById('btn-close-upload');
  const btnDiscardRecording = document.getElementById('btn-discard-recording');
  const btnSaveRecording = document.getElementById('btn-save-recording');
  const recDisplayNameInput = document.getElementById('rec-display-name');

  // Helper: Format Time
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  // --- SCREEN ROUTING ---
  function switchScreen(screenName) {
    // Stop anything active in previous screens
    if (currentScreen === 'studio' && screenName !== 'studio') {
      exitStudioSession();
    }
    
    // Toggle active screen classes
    Object.keys(screens).forEach(key => {
      if (key === screenName) {
        screens[key].classList.add('active');
      } else {
        screens[key].classList.remove('active');
      }
    });

    // Toggle nav active states
    Object.keys(navBtns).forEach(key => {
      if (key === screenName) {
        navBtns[key].classList.add('active');
      } else {
        navBtns[key].classList.remove('active');
      }
    });

    currentScreen = screenName;
    
    // Run updates for screens when loading
    if (screenName === 'home') {
      renderSongsCatalog();
    } else if (screenName === 'gallery') {
      renderRecordingsGallery();
    }
  }

  // Bind Navigation events
  navBtns.home.addEventListener('click', () => switchScreen('home'));
  navBtns.gallery.addEventListener('click', () => switchScreen('gallery'));
  navBtns.live.addEventListener('click', () => switchScreen('live'));
  document.getElementById('hero-action-btn').addEventListener('click', () => {
    // Scroll to songs catalogue
    document.querySelector('.catalog-header').scrollIntoView({ behavior: 'smooth' });
  });

  // --- CATALOG RENDER ---
  function renderSongsCatalog(filter = 'all', searchQuery = '') {
    // Clear dynamic cards (preserving the upload card)
    const cards = songsContainer.querySelectorAll('.song-card:not(#btn-trigger-upload)');
    cards.forEach(card => card.remove());

    const allSongs = [...window.songsCatalog, ...customSongs];
    const query = searchQuery.toLowerCase().trim();

    allSongs.forEach(song => {
      // Check category filter
      const isCustom = customSongs.includes(song);
      if (filter !== 'all') {
        if (filter === 'custom' && !isCustom) return;
        if (filter !== 'custom' && song.genre !== filter) return;
      }

      // Check search match
      if (query !== '') {
        const titleMatch = song.title.toLowerCase().includes(query);
        const artistMatch = song.artist.toLowerCase().includes(query);
        if (!titleMatch && !artistMatch) return;
      }

      // Create card structure
      const card = document.createElement('div');
      card.className = 'song-card';
      card.innerHTML = `
        <div class="song-info">
          <h4>${song.title}</h4>
          <p>${song.artist}</p>
          <div class="song-meta">
            <span class="badge badge-genre">${song.genre}</span>
            <span class="badge badge-difficulty">${song.difficulty || 'Easy'}</span>
          </div>
        </div>
        <div class="song-actions">
          <button class="sing-btn" data-id="${song.id}"><i class="fa-solid fa-microphone"></i> Sing</button>
          <button class="duet-icon-btn" data-id="${song.id}" title="Sing Duet Mode"><i class="fa-solid fa-users"></i> Duet</button>
        </div>
      `;

      // Bind buttons
      card.querySelector('.sing-btn').addEventListener('click', () => {
        activeSingingMode = 'solo';
        launchStudio(song);
      });

      card.querySelector('.duet-icon-btn').addEventListener('click', () => {
        activeSong = song;
        modalDuetPicker.classList.add('active');
      });

      // Append card before the upload card
      songsContainer.insertBefore(card, btnTriggerUpload);
    });
  }

  // Search Filter triggers
  searchInput.addEventListener('input', (e) => {
    const activeTab = document.querySelector('.filter-tabs .tab-btn.active');
    const filter = activeTab ? activeTab.dataset.filter : 'all';
    renderSongsCatalog(filter, e.target.value);
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderSongsCatalog(e.target.dataset.filter, searchInput.value);
    });
  });

  // --- DUET MODE PICKER ---
  modalDuetPicker.querySelectorAll('.duet-opt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modeBtn = e.target.closest('.duet-opt-btn');
      activeSingingMode = modeBtn.dataset.mode;
      modalDuetPicker.classList.remove('active');
      launchStudio(activeSong);
    });
  });

  btnCloseDuet.addEventListener('click', () => {
    modalDuetPicker.classList.remove('active');
  });

  // --- CUSTOM SONG UPLOADER ---
  btnTriggerUpload.addEventListener('click', () => {
    modalUpload.classList.add('active');
  });

  btnCloseUpload.addEventListener('click', () => {
    modalUpload.classList.remove('active');
  });

  uploadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('up-title').value;
    const artist = document.getElementById('up-artist').value;
    const genre = document.getElementById('up-genre').value || 'Custom';
    const bpm = parseInt(document.getElementById('up-tempo').value) || 120;
    const lyricsText = document.getElementById('up-lyrics').value;
    const audioFile = document.getElementById('up-audio').files[0];

    if (!audioFile) return;

    // Parse lyrics from plain text / LRC format
    const parsedLyrics = parseCustomLyrics(lyricsText);

    // Read audio file as local Blob/Object URL
    const fileUrl = URL.createObjectURL(audioFile);

    // Create custom song node (custom songs use loaded audio buffer/URL instead of synthData)
    const customSongId = 'custom-' + Date.now();
    const newSong = {
      id: customSongId,
      title: title,
      artist: artist,
      genre: genre,
      difficulty: 'Medium',
      tempo: bpm,
      audioUrl: fileUrl, // Backing track direct file loading
      lyrics: parsedLyrics,
      synthData: { notes: [], chords: [] } // empty synth as we play the audio file
    };

    customSongs.push(newSong);
    uploadForm.reset();
    modalUpload.classList.remove('active');
    
    // Switch to custom filter tab and re-render
    filterBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('.tab-btn[data-filter="custom"]').classList.add('active');
    renderSongsCatalog('custom');
  });

  // Parser: converts LRC formatted timestamps or raw text lines into structured array
  function parseCustomLyrics(text) {
    const lines = text.split('\n');
    const lyrics = [];
    // Matches patterns like [00:12] or [00:12.30] or [12.3]
    const lrcRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/;
    let fallbackTime = 0.0;

    lines.forEach(line => {
      const match = lrcRegex.exec(line);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const cent = match[3] ? parseInt(match[3]) : 0;
        const time = min * 60 + sec + (cent / 100);
        const lyricText = line.replace(lrcRegex, '').trim();
        if (lyricText !== '') {
          lyrics.push({ time, text: lyricText, part: 'Duet' });
        }
      } else {
        // Fallback for lines without timestamps: space them out every 4 seconds
        const cleanText = line.trim();
        if (cleanText !== '') {
          lyrics.push({ time: fallbackTime, text: cleanText, part: 'Duet' });
          fallbackTime += 4.0;
        }
      }
    });

    // Sort lyrics by timeline
    return lyrics.sort((a, b) => a.time - b.time);
  }

  // --- SINGING STUDIO LAUNCH ---
  async function launchStudio(song) {
    activeSong = song;
    switchScreen('studio');

    // If connected to multiplayer and we are Host, notify Guest to launch their part
    if (socket && conn && isHost) {
      const guestMode = activeSingingMode === 'duet-part-a' ? 'duet-part-b' : activeSingingMode === 'duet-part-b' ? 'duet-part-a' : 'solo';
      try {
        conn.send({
          type: 'START_SONG',
          songId: song.id,
          mode: guestMode
        });
      } catch(e) {}
    }

    // Camera video container display
    // Camera video container display
    if (socket && conn) {
      document.getElementById('studio-camera-container').style.display = 'flex';
      
      // Bind local video element
      const localWrapper = document.getElementById('video-local').parentElement;
      const vidLocal = document.getElementById('video-local');
      if (localMediaStream && localMediaStream.getVideoTracks().length > 0) {
        vidLocal.srcObject = localMediaStream;
        vidLocal.play().catch(e => console.log("Studio local video play failed:", e));
        localWrapper.classList.remove('no-video');
      } else {
        vidLocal.srcObject = null;
        localWrapper.classList.add('no-video');
      }
      
      // Bind remote video element
      const remoteWrapper = document.getElementById('video-remote').parentElement;
      const vidRemote = document.getElementById('video-remote');
      if (remoteStream && remoteStream.getVideoTracks().length > 0) {
        vidRemote.srcObject = remoteStream;
        vidRemote.play().catch(e => console.log("Studio remote video play failed:", e));
        remoteWrapper.classList.remove('no-video');
      } else {
        vidRemote.srcObject = null;
        remoteWrapper.classList.add('no-video');
      }

      // Set studio usernames
      const lblLocal = document.getElementById('lbl-studio-local-username');
      if (lblLocal) lblLocal.textContent = loggedInUser || 'You';
      const lblRemote = document.getElementById('lbl-studio-remote-username');
      if (lblRemote) lblRemote.textContent = remotePartnerUsername || 'Partner';
    } else {
      document.getElementById('studio-camera-container').style.display = 'none';
    }

    studioSongTitle.textContent = song.title;
    studioSongArtist.textContent = song.artist;
    
    // Update badge text and style
    if (activeSingingMode === 'solo') {
      studioModeBadge.textContent = 'Solo';
      studioModeBadge.className = 'singing-mode-tag';
    } else if (activeSingingMode === 'duet-part-a') {
      studioModeBadge.textContent = 'Duet - Part A';
      studioModeBadge.className = 'singing-mode-tag duet-a';
    } else if (activeSingingMode === 'duet-part-b') {
      studioModeBadge.textContent = 'Duet - Part B';
      studioModeBadge.className = 'singing-mode-tag duet-b';
    }

    // Populate Lyrics panel
    lyricsContainer.innerHTML = '';
    song.lyrics.forEach((line, index) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = `lyric-line ${line.part === 'A' ? 'part-a' : line.part === 'B' ? 'part-b' : 'part-duet'}`;
      lineDiv.textContent = line.text;
      lineDiv.id = `lyric-line-${index}`;
      lyricsContainer.appendChild(lineDiv);
    });

    // Check if the song has external audioUrl
    if (song.audioUrl) {
      // Custom backing track: Load audio elements to audioEngine
      setupCustomAudioEngineTrack(song.audioUrl);
    }

    // Setup visualizers
    setupVisualizerCanvas();
    setupPitchCanvas();
  }

  function setupCustomAudioEngineTrack(url) {
    // If we have a custom song audioUrl, we monkeypatch audioEngine to load/play it!
    window.audioEngine.customAudio = new Audio(url);
    window.audioEngine.customAudio.crossOrigin = "anonymous";
    
    // Connect audio node to synth gain destination inside audioEngine
    window.audioEngine.customAudioSource = null;
    
    window.audioEngine.playSong = function(song) {
      this.currentSong = song;
      this.isPlaying = true;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      // Connect node on first play
      if (!this.customAudioSource && this.audioCtx) {
        this.customAudioSource = this.audioCtx.createMediaElementSource(this.customAudio);
        this.customAudioSource.connect(this.synthGain);
      }
      
      this.customAudio.currentTime = this.pauseTime;
      this.customAudio.play();
    };

    window.audioEngine.pauseSong = function() {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      this.customAudio.pause();
      this.pauseTime = this.customAudio.currentTime;
    };

    window.audioEngine.stopSong = function() {
      this.isPlaying = false;
      if (this.customAudio) {
        this.customAudio.pause();
        this.customAudio.currentTime = 0;
      }
      this.pauseTime = 0;
      this.currentSong = null;
    };

    window.audioEngine.getCurrentPlayTime = function() {
      return this.customAudio ? this.customAudio.currentTime : 0;
    };

    window.audioEngine.getSongDuration = function() {
      return this.customAudio ? this.customAudio.duration : 0;
    };

    // Auto trigger end check
    window.audioEngine.customAudio.onended = () => {
      window.audioEngine.stopSong();
      if (window.audioEngine.onSongEndCallback) window.audioEngine.onSongEndCallback();
    };
  }

  // Restore the original audio engine scheduler if launching a built-in synthesized song
  function restoreSynthEngine() {
    // Delete custom audio overrides
    delete window.audioEngine.customAudio;
    delete window.audioEngine.customAudioSource;
    
    // Reload original prototypes from audio-effects.js definition
    const prototypeSource = new KaraokeAudioEngine();
    window.audioEngine.playSong = prototypeSource.playSong.bind(window.audioEngine);
    window.audioEngine.pauseSong = prototypeSource.pauseSong.bind(window.audioEngine);
    window.audioEngine.stopSong = prototypeSource.stopSong.bind(window.audioEngine);
    window.audioEngine.getCurrentPlayTime = prototypeSource.getCurrentPlayTime.bind(window.audioEngine);
    window.audioEngine.getSongDuration = prototypeSource.getSongDuration.bind(window.audioEngine);
  }

  // --- LOCAL CAMERA & MICROPHONE STREAM CAPTURE ---
  async function startLocalMediaStream(requestVideo = false) {
    if (localMediaStream) {
      const hasVideo = localMediaStream.getVideoTracks().length > 0;
      if (!requestVideo || hasVideo) {
        return localMediaStream;
      }
      // If video requested but current stream is audio-only, clean up and re-request
      try {
        localMediaStream.getTracks().forEach(track => track.stop());
      } catch(e){}
      localMediaStream = null;
      window.audioEngine.micStream = null;
      if (window.audioEngine.micSource) {
        try { window.audioEngine.micSource.disconnect(); } catch(e){}
        window.audioEngine.micSource = null;
      }
    }
    
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false
      }
    };
    if (requestVideo) {
      constraints.video = { width: 320, height: 240, frameRate: 24 };
    }
    
    try {
      localMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Setup audio engine using this stream
      await window.audioEngine.init();
      window.audioEngine.micStream = localMediaStream;
      window.audioEngine.micSource = window.audioEngine.audioCtx.createMediaStreamSource(localMediaStream);
      window.audioEngine.micSource.connect(window.audioEngine.lowCutFilter);
      
      micActive = true;
      return localMediaStream;
    } catch (err) {
      console.error('Failed to get media devices:', err);
      if (requestVideo) {
        console.warn('Video stream request failed. Falling back to audio-only stream capture...');
        try {
          const audioOnlyConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false
            }
          };
          localMediaStream = await navigator.mediaDevices.getUserMedia(audioOnlyConstraints);
          
          await window.audioEngine.init();
          window.audioEngine.micStream = localMediaStream;
          window.audioEngine.micSource = window.audioEngine.audioCtx.createMediaStreamSource(localMediaStream);
          window.audioEngine.micSource.connect(window.audioEngine.lowCutFilter);
          
          micActive = true;
          return localMediaStream;
        } catch (audioErr) {
          console.error('Audio capture fallback failed:', audioErr);
          throw audioErr;
        }
      } else {
        throw err;
      }
    }
  }

  // --- STUDIO CONTROLS & RECORDING STATE MACHINE ---
  async function startRecordingProcess() {
    if (!micActive) {
      try {
        // Request video camera stream if connected to multiplayer
        const requestVideo = !!(socket && conn);
        await startLocalMediaStream(requestVideo);
        
        // Setup volume values
        window.audioEngine.setVocalVolume(sliderVocalVolume.value);
        window.audioEngine.setSynthVolume(sliderBackingVolume.value);
      } catch (err) {
        alert('Microphone/Camera access is required to sing and record.');
        return;
      }
    }

    isRecording = true;
    btnRecordMain.className = 'control-circle-btn btn-rec-stop';
    btnRecordMain.innerHTML = '<i class="fa-solid fa-square"></i>';
    btnStudioFinish.style.display = 'inline-flex';
    
    totalPitchTicks = 0;
    matchPitchTicks = 0;

    // Check if song is synth or custom
    if (!activeSong.audioUrl) {
      restoreSynthEngine();
    }

    // Start playing backing track
    window.audioEngine.playSong(activeSong);
    window.audioEngine.startRecording();
    
    // Hook end callback
    window.audioEngine.onSongEndCallback = () => {
      finishRecordingReview();
    };
    
    // Start visualization and pitch loop
    startPitchTrackingGameLoop();
    startVocalWaveformVisualizer();
    
    // Active states for interface
    lyricsContainer.classList.add('singing');
  }

  btnRecordMain.addEventListener('click', async () => {
    if (!isRecording) {
      // If connected to multiplayer and Host, sync peer recording start
      if (peer && conn && isHost) {
        try { conn.send({ type: 'RECORD_SONG' }); } catch(e){}
      }
      await startRecordingProcess();
    } else {
      // If connected to multiplayer and Host, sync peer recording end
      if (peer && conn && isHost) {
        try { conn.send({ type: 'STOP_SONG' }); } catch(e){}
      }
      finishRecordingReview();
    }
  });

  btnStudioFinish.addEventListener('click', () => {
    finishRecordingReview();
  });

  async function finishRecordingReview() {
    if (!isRecording) return;
    
    // Stop recording and retrieve Blob
    isRecording = false;
    btnRecordMain.className = 'control-circle-btn btn-rec-start';
    btnRecordMain.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    btnStudioFinish.style.display = 'none';
    
    window.audioEngine.pauseSong();
    currentRecordingBlob = await window.audioEngine.stopRecording();
    
    // Stop visualizer frames
    cancelAnimationFrame(visualizerFrameId);
    cancelAnimationFrame(pitchTrackerFrameId);
    
    // Clean lyrics highlight
    lyricsContainer.classList.remove('singing');
    
    // Compute Score
    let score = 0;
    if (totalPitchTicks > 0) {
      score = Math.round((matchPitchTicks / totalPitchTicks) * 100);
    } else {
      // fallback mock score if mic was offline or no singing
      score = Math.floor(Math.random() * 30) + 60; // 60 - 90
    }
    
    // Display score review modal
    document.getElementById('save-song-details').textContent = `${activeSong.title} (${activeSong.artist}) - ${activeSingingMode.replace('-', ' ')}`;
    document.getElementById('score-number').textContent = score;
    
    // Star rating string
    let stars = '⭐';
    if (score >= 90) stars = '⭐⭐⭐⭐⭐';
    else if (score >= 75) stars = '⭐⭐⭐⭐';
    else if (score >= 50) stars = '⭐⭐⭐';
    else if (score >= 25) stars = '⭐⭐';
    
    document.getElementById('score-stars').textContent = stars;
    recDisplayNameInput.value = `My ${activeSong.title} ${activeSingingMode === 'solo' ? 'Solo' : 'Duet'}`;
    
    modalSaveReview.classList.add('active');
  }

  // --- SAVE / DISCARD RECORDING ---
  btnSaveRecording.addEventListener('click', async () => {
    if (!currentRecordingBlob) return;
    
    const performanceTitle = recDisplayNameInput.value || `Performance of ${activeSong.title}`;
    const score = parseInt(document.getElementById('score-number').textContent);
    const duration = window.audioEngine.getSongDuration() || 30; // fallback seconds

    const recordingData = {
      songId: activeSong.id,
      title: performanceTitle,
      artist: activeSong.artist,
      duration: duration,
      audioBlob: currentRecordingBlob,
      type: activeSingingMode,
      score: score
    };

    try {
      await window.karaokeDb.saveRecording(recordingData);
      modalSaveReview.classList.remove('active');
      exitStudioSession();
      switchScreen('gallery');
    } catch(err) {
      console.error("Save failed:", err);
      alert("Failed to save recording to database.");
    }
  });

  btnDiscardRecording.addEventListener('click', () => {
    if (confirm("Are you sure you want to discard this recording?")) {
      modalSaveReview.classList.remove('active');
      exitStudioSession();
      switchScreen('home');
    }
  });

  btnStudioExit.addEventListener('click', () => {
    if (isRecording) {
      if (!confirm("Your recording is currently in progress. Exit and discard?")) {
        return;
      }
    }
    exitStudioSession();
    switchScreen('home');
  });

  function exitStudioSession() {
    isRecording = false;
    btnRecordMain.className = 'control-circle-btn btn-rec-start';
    btnRecordMain.innerHTML = '<i class="fa-solid fa-microphone"></i>';
    btnStudioFinish.style.display = 'none';

    window.audioEngine.stopSong();
    
    // Only stop tracks if we are not connected in multiplayer call
    if (!(socket && conn)) {
      if (localMediaStream) {
        localMediaStream.getTracks().forEach(track => track.stop());
        localMediaStream = null;
      }
      window.audioEngine.micStream = null;
      window.audioEngine.micSource = null;
      micActive = false;
      document.getElementById('video-local').srcObject = null;
    }

    // Reset visual frames
    cancelAnimationFrame(visualizerFrameId);
    cancelAnimationFrame(pitchTrackerFrameId);

    // Reset lyrics scroll
    lyricsContainer.innerHTML = '';
    timeCurrent.textContent = '0:00';
    progressFill.style.width = '0%';
  }

  // --- REAL-TIME LYRICS ENGINE & PITCH TRACKER ---
  function startPitchTrackingGameLoop() {
    const ctx = pitchCanvas.getContext('2d');
    const notes = activeSong.synthData.notes || [];
    
    function draw() {
      if (!isRecording) return;
      pitchTrackerFrameId = requestAnimationFrame(draw);
      
      const currentTime = window.audioEngine.getCurrentPlayTime();
      const songDuration = window.audioEngine.getSongDuration();
      
      // Update timer labels & progress timeline
      timeCurrent.textContent = formatTime(currentTime);
      timeTotal.textContent = formatTime(songDuration);
      
      const progressPercent = (currentTime / songDuration) * 100;
      progressFill.style.width = `${progressPercent}%`;

      // Highlight corresponding Lyric Line based on timer
      updateLyricsSync(currentTime);

      // --- Draw Pitch Game Scroll lane ---
      ctx.clearRect(0, 0, pitchCanvas.width, pitchCanvas.height);
      
      // Pitch grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < pitchCanvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(pitchCanvas.width, i);
        ctx.stroke();
      }

      // Track target notes
      // X coordinate is mapping seconds into pixels
      const pixelsPerSecond = 50; 
      const startX = 120; // Singer position marker
      
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 2;

      let currentTargetFreq = null;
      let currentTargetPitchName = '';

      // Draw all notes in window (from 2s ago to 8s in future)
      notes.forEach(note => {
        const noteX = startX + (note.time - currentTime) * pixelsPerSecond;
        const noteWidth = note.duration * pixelsPerSecond;
        
        // Y mapping: map notes from G3 (196Hz) to A5 (880Hz) into canvas height
        const noteFreq = window.noteToFreq(note.pitch);
        const noteY = mapFreqToY(noteFreq, pitchCanvas.height);
        
        // Draw note block if on-screen
        if (noteX + noteWidth > 0 && noteX < pitchCanvas.width) {
          ctx.beginPath();
          ctx.roundRect(noteX, noteY - 6, noteWidth, 12, 6);
          ctx.fill();
          ctx.stroke();
        }

        // Detect if this note is active right now
        if (currentTime >= note.time && currentTime <= note.time + note.duration) {
          currentTargetFreq = noteFreq;
          currentTargetPitchName = note.pitch;
        }
      });

      // Draw singer marker vertical line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, pitchCanvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fetch User's Vocal Pitch
      const userPitchData = window.audioEngine.detectPitch();
      
      if (userPitchData) {
        const userFreq = userPitchData.frequency;
        const userY = mapFreqToY(userFreq, pitchCanvas.height);
        
        // Send our real-time pitch to the peer so they can see our indicator!
        if (peer && conn && totalPitchTicks % 3 === 0) {
          try {
            conn.send({
              type: 'PITCH_UPDATE',
              pitch: {
                frequency: userFreq,
                note: userPitchData.note,
                y: userY
              }
            });
          } catch(e) {}
        }

        // Check alignment with active note
        let isPitchMatched = false;
        if (currentTargetFreq) {
          // Compare frequencies in logarithmic semitones
          const centsDiff = Math.abs(1200 * Math.log2(userFreq / currentTargetFreq));
          if (centsDiff <= 100) { // Within 1 semitone
            isPitchMatched = true;
          }
        }
        
        // Draw Glowing Singer Dot
        ctx.shadowBlur = 15;
        if (isPitchMatched) {
          ctx.shadowColor = 'rgba(57, 255, 20, 1)'; // Neon green
          ctx.fillStyle = '#39ff14';
          matchPitchTicks++;
          
          // Draw score flash text on matching
          document.getElementById('pitch-tuner-label').innerHTML = `HIT! Singing ${userPitchData.note} (Target: ${currentTargetPitchName})`;
          document.getElementById('pitch-tuner-label').style.color = '#39ff14';
        } else {
          ctx.shadowColor = 'rgba(255, 0, 127, 0.8)'; // Neon pink
          ctx.fillStyle = '#ff007f';
          
          if (currentTargetFreq) {
            document.getElementById('pitch-tuner-label').innerHTML = `Singing ${userPitchData.note} (Target: ${currentTargetPitchName})`;
          } else {
            document.getElementById('pitch-tuner-label').innerHTML = `Singing ${userPitchData.note}`;
          }
          document.getElementById('pitch-tuner-label').style.color = '#ff007f';
        }
        totalPitchTicks++;
        
        ctx.beginPath();
        ctx.arc(startX, userY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      } else {
        document.getElementById('pitch-tuner-label').innerHTML = currentTargetPitchName ? `Next target note: ${currentTargetPitchName}` : 'Sing into your mic!';
        document.getElementById('pitch-tuner-label').style.color = 'var(--accent-blue)';
      }

      // Draw remote peer's pitch node if available (Multiplayer!)
      if (peer && conn && remoteUserPitch) {
        ctx.shadowBlur = 15;
        // Host gets Blue, Guest gets Pink
        if (isHost) {
          ctx.shadowColor = 'rgba(255, 0, 127, 0.8)'; // Pink dot for guest
          ctx.fillStyle = '#ff007f';
        } else {
          ctx.shadowColor = 'rgba(0, 240, 255, 0.8)'; // Blue dot for host
          ctx.fillStyle = '#00f0ff';
        }
        ctx.beginPath();
        ctx.arc(startX + 25, remoteUserPitch.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }
    }
    
    // Y position mapper for frequencies (Log scale mapping)
    function mapFreqToY(freq, height) {
      const minF = 130; // C3
      const maxF = 660; // E5
      
      const logMin = Math.log(minF);
      const logMax = Math.log(maxF);
      const logFreq = Math.log(Math.max(minF, Math.min(maxF, freq)));
      
      // Invert Y since canvas coordinate starts at top
      return height - ((logFreq - logMin) / (logMax - logMin)) * height;
    }

    draw();
  }

  function updateLyricsSync(currentTime) {
    const lyrics = activeSong.lyrics;
    let activeIndex = -1;

    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        activeIndex = i;
      }
    }

    if (activeIndex !== -1) {
      // Toggle lyric highlight classes
      lyrics.forEach((_, idx) => {
        const lineEl = document.getElementById(`lyric-line-${idx}`);
        if (!lineEl) return;
        
        if (idx === activeIndex) {
          if (!lineEl.classList.contains('active')) {
            lineEl.className = lineEl.className.replace('passed', '').trim();
            lineEl.classList.add('active');
            
            // Auto scroll container
            const boxHeight = lyricsContainer.clientHeight;
            const lineOffsetTop = lineEl.offsetTop;
            const lineHeight = lineEl.clientHeight;
            
            lyricsContainer.scrollTop = lineOffsetTop - (boxHeight / 2) + (lineHeight / 2);
          }
        } else if (idx < activeIndex) {
          lineEl.classList.remove('active');
          lineEl.classList.add('passed');
        } else {
          lineEl.classList.remove('active');
          lineEl.classList.remove('passed');
        }
      });
    }
  }

  // --- LIVE INPUT WAVEFORM MONITOR ---
  function startVocalWaveformVisualizer() {
    const ctx = visualizerCanvas.getContext('2d');
    const bufferLength = window.audioEngine.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
      if (!isRecording) return;
      visualizerFrameId = requestAnimationFrame(draw);
      
      window.audioEngine.analyserNode.getByteTimeDomainData(dataArray);
      
      ctx.fillStyle = 'rgba(10, 8, 24, 0.4)';
      ctx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
      
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
      
      ctx.beginPath();
      
      const sliceWidth = visualizerCanvas.width * 1.0 / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * visualizerCanvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.lineTo(visualizerCanvas.width, visualizerCanvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }
    
    draw();
  }

  // Setup static sizes for canvases
  function setupVisualizerCanvas() {
    visualizerCanvas.width = visualizerCanvas.parentElement.clientWidth;
    visualizerCanvas.height = 70;
  }

  function setupPitchCanvas() {
    pitchCanvas.width = pitchCanvas.parentElement.clientWidth;
    pitchCanvas.height = 90;
  }

  window.addEventListener('resize', () => {
    if (currentScreen === 'studio') {
      setupVisualizerCanvas();
      setupPitchCanvas();
    }
  });

  // --- MIXER SLIDERS LISTENERS ---
  sliderVocalVolume.addEventListener('input', (e) => {
    const val = e.target.value;
    labelVocalVol.textContent = `${Math.round(val * 100)}%`;
    if (window.audioEngine) {
      window.audioEngine.setVocalVolume(val);
    }
  });

  sliderBackingVolume.addEventListener('input', (e) => {
    const val = e.target.value;
    labelBackingVol.textContent = `${Math.round(val * 100)}%`;
    if (window.audioEngine) {
      window.audioEngine.setSynthVolume(val);
    }
  });

  fxBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      fxBtns.forEach(b => b.classList.remove('active'));
      const triggerBtn = e.target.closest('.fx-btn');
      triggerBtn.classList.add('active');
      
      const preset = triggerBtn.dataset.fx;
      window.audioEngine.setPreset(preset);
    });
  });

  // --- GALLERY SCREEN ENGINE ---
  async function renderRecordingsGallery() {
    recordingsContainer.innerHTML = '';
    
    try {
      const recordings = await window.karaokeDb.getAllRecordings();
      
      if (recordings.length === 0) {
        recordingsContainer.innerHTML = `
          <div class="gallery-empty">
            <i class="fa-solid fa-circle-nodes gallery-empty-icon"></i>
            <h4>No Recordings Yet</h4>
            <p style="margin-top: 5px; color: var(--text-muted);">Choose a song from the catalog, record your performance, and it will appear here!</p>
          </div>
        `;
        return;
      }

      recordings.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'recording-item';
        
        const dateStr = new Date(rec.date).toLocaleDateString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        item.innerHTML = `
          <div class="rec-info">
            <h4>${rec.title}</h4>
            <p>${rec.artist}</p>
            <div class="rec-meta-p">
              <span style="font-size: 12px; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> ${formatTime(rec.duration)}</span>
              <span style="font-size: 12px; color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> ${dateStr}</span>
              <span class="score-badge">Score: ${rec.score}%</span>
              <span class="badge" style="background: rgba(255, 255, 255, 0.05); color: var(--text-secondary);">${rec.type.replace('-', ' ')}</span>
            </div>
          </div>
          <div class="rec-player-controls">
            <button class="play-btn-circle" data-id="${rec.id}"><i class="fa-solid fa-play"></i></button>
            <button class="delete-btn-trash" data-id="${rec.id}"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        `;

        // Player instance variables
        let playAudio = null;
        const playBtn = item.querySelector('.play-btn-circle');
        
        playBtn.addEventListener('click', () => {
          // If already playing this track, pause it
          if (playAudio && !playAudio.paused) {
            playAudio.pause();
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
          } else {
            // Stop other playing audios in gallery first
            document.querySelectorAll('.play-btn-circle').forEach(btn => {
              btn.innerHTML = '<i class="fa-solid fa-play"></i>';
            });
            if (window.activeGalleryAudio) {
              window.activeGalleryAudio.pause();
            }

            // Generate blob url and play
            const blobUrl = URL.createObjectURL(rec.audioBlob);
            playAudio = new Audio(blobUrl);
            window.activeGalleryAudio = playAudio;
            
            playAudio.play();
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            
            playAudio.onended = () => {
              playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
              URL.revokeObjectURL(blobUrl);
            };
          }
        });

        item.querySelector('.delete-btn-trash').addEventListener('click', async () => {
          if (confirm(`Are you sure you want to delete "${rec.title}"?`)) {
            if (playAudio) playAudio.pause();
            await window.karaokeDb.deleteRecording(rec.id);
            renderRecordingsGallery(); // refresh
          }
        });

        recordingsContainer.appendChild(item);
      });
    } catch (err) {
      console.error("Error loading gallery:", err);
      recordingsContainer.innerHTML = `<p style="color:red; text-align:center;">Failed to load performances from IndexedDB.</p>`;
    }
  }

  // --- MULTIPLAYER P2P LIFE CYCLE & OFFLINE BROADCAST FALLBACK ---
  let connectionTimeoutId = null;
  let localChannel = null;

  function initMultiplayerHost() {
    isHost = true;
    btnHostRoom.disabled = true;
    btnHostRoom.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing Peer...';
    
    // Set a 3-second fallback timer
    connectionTimeoutId = setTimeout(() => {
      console.warn("PeerJS connection timed out. Falling back to offline local connection.");
      if (peer) {
        try { peer.destroy(); } catch(e){}
        peer = null;
      }
      startLocalOfflineHost();
    }, 3000);

    // If PeerJS library failed to load, fall back immediately
    if (typeof Peer === 'undefined') {
      clearTimeout(connectionTimeoutId);
      startLocalOfflineHost();
      return;
    }

    try {
      peer = new Peer({
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true
      });
      
      peer.on('open', (id) => {
        clearTimeout(connectionTimeoutId);
        console.log('Peer Host opened with ID:', id);
        lblRoomId.textContent = id;
        hostCodeDisplay.style.display = 'block';
        btnHostRoom.innerHTML = '<i class="fa-solid fa-house-chimney-medical"></i> Generate Live Room';
        
        liveConnectionBoard.style.display = 'block';
        lblConnectionStatus.textContent = 'Room Created. Waiting for partner...';
        lblPeerDetails.textContent = 'Share the Room ID below to connect.';
        connectionStatusDot.style.background = '#e9c46a';
      });
      
      peer.on('error', (err) => {
        clearTimeout(connectionTimeoutId);
        console.error('Peer host error:', err);
        // Fall back immediately on error
        startLocalOfflineHost();
      });
      
      peer.on('connection', (connection) => {
        conn = connection;
        setupDataConnectionListeners();
      });
      
      peer.on('call', async (call) => {
        mediaCall = call;
        try {
          // Host requests both camera and audio
          const stream = await startLocalMediaStream(true);
          call.answer(stream);
          
          // Show local camera preview
          const localWrapper = document.getElementById('video-local').parentElement;
          if (stream.getVideoTracks().length > 0) {
            document.getElementById('video-local').srcObject = stream;
            localWrapper.classList.remove('no-video');
          } else {
            document.getElementById('video-local').srcObject = null;
            localWrapper.classList.add('no-video');
          }
          
          call.on('stream', (remoteAudioVideoStream) => {
            remoteStream = remoteAudioVideoStream;
            window.audioEngine.addRemoteStream(remoteAudioVideoStream);
            
            const remoteWrapper = document.getElementById('video-remote').parentElement;
            if (remoteAudioVideoStream.getVideoTracks().length > 0) {
              document.getElementById('video-remote').srcObject = remoteAudioVideoStream;
              remoteWrapper.classList.remove('no-video');
            } else {
              document.getElementById('video-remote').srcObject = null;
              remoteWrapper.classList.add('no-video');
            }
            
            lblConnectionStatus.textContent = 'Voice & Video Connected!';
            lblPeerDetails.textContent = 'Connected to remote singer. Ready to select song.';
            connectionStatusDot.style.background = '#2a9d8f'; // Green: connected
          });
        } catch(err) {
          console.error("Failed to answer peer call:", err);
        }
      });
    } catch (e) {
      clearTimeout(connectionTimeoutId);
      startLocalOfflineHost();
    }
  }

  async function startLocalOfflineHost() {
    console.log("Starting Local Offline Host...");
    btnHostRoom.disabled = false;
    btnHostRoom.innerHTML = '<i class="fa-solid fa-house-chimney-medical"></i> Generate Live Room';
    
    try {
      const stream = await startLocalMediaStream(true);
      document.getElementById('video-local').srcObject = stream;
    } catch(e) {
      alert("Microphone & Camera access is required.");
      disconnectMultiplayer();
      return;
    }
    
    lblRoomId.textContent = "OFFLINE-MODE";
    hostCodeDisplay.style.display = 'block';
    
    initLocalOfflineConnection(true);
  }

  async function initMultiplayerJoin() {
    const targetRoomId = inputRoomId.value.trim().toLowerCase();
    if (!targetRoomId) {
      alert("Please enter a valid Room ID.");
      return;
    }
    
    isHost = false;
    btnJoinRoom.disabled = true;
    btnJoinRoom.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';

    // If Room ID is OFFLINE-MODE or offline, fall back directly
    if (targetRoomId.toUpperCase() === 'OFFLINE-MODE' || typeof Peer === 'undefined') {
      startLocalOfflineGuest();
      return;
    }
    
    // Set a 3-second fallback timer
    connectionTimeoutId = setTimeout(() => {
      console.warn("PeerJS connection timed out. Falling back to offline local connection.");
      if (peer) {
        try { peer.destroy(); } catch(e){}
        peer = null;
      }
      startLocalOfflineGuest();
    }, 3000);

    try {
      peer = new Peer({
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true
      });
      
      peer.on('open', async (id) => {
        clearTimeout(connectionTimeoutId);
        console.log('Guest peer opened with ID:', id);
        liveConnectionBoard.style.display = 'block';
        lblConnectionStatus.textContent = 'Connecting to Room: ' + targetRoomId;
        lblPeerDetails.textContent = 'Requesting camera/microphone access...';
        connectionStatusDot.style.background = '#e9c46a';
        
        try {
          // Request camera + mic
          const stream = await startLocalMediaStream(true);
          
          // Connect data channel
          conn = peer.connect(targetRoomId);
          setupDataConnectionListeners();
          
          mediaCall = peer.call(targetRoomId, stream);
          
          const localWrapper = document.getElementById('video-local').parentElement;
          if (stream.getVideoTracks().length > 0) {
            document.getElementById('video-local').srcObject = stream;
            localWrapper.classList.remove('no-video');
          } else {
            document.getElementById('video-local').srcObject = null;
            localWrapper.classList.add('no-video');
          }
          
          mediaCall.on('stream', (remoteAudioVideoStream) => {
            remoteStream = remoteAudioVideoStream;
            window.audioEngine.addRemoteStream(remoteAudioVideoStream);
            
            const remoteWrapper = document.getElementById('video-remote').parentElement;
            if (remoteAudioVideoStream.getVideoTracks().length > 0) {
              document.getElementById('video-remote').srcObject = remoteAudioVideoStream;
              remoteWrapper.classList.remove('no-video');
            } else {
              document.getElementById('video-remote').srcObject = null;
              remoteWrapper.classList.add('no-video');
            }
            
            lblConnectionStatus.textContent = 'Voice & Video Connected!';
            lblPeerDetails.textContent = 'Connected to Host. Wait for them to select a song.';
            connectionStatusDot.style.background = '#2a9d8f';
          });
        } catch (err) {
          alert("Camera and Microphone streams are required to join.");
          disconnectMultiplayer();
        }
      });
      
      peer.on('error', (err) => {
        clearTimeout(connectionTimeoutId);
        console.error('Peer join error:', err);
        startLocalOfflineGuest();
      });
    } catch(e) {
      clearTimeout(connectionTimeoutId);
      startLocalOfflineGuest();
    }
  }

  async function startLocalOfflineGuest() {
    console.log("Starting Local Offline Guest...");
    btnJoinRoom.disabled = false;
    btnJoinRoom.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Connect to Room';
    
    try {
      const stream = await startLocalMediaStream(true);
      document.getElementById('video-local').srcObject = stream;
    } catch (err) {
      alert("Camera and Microphone streams are required to join.");
      disconnectMultiplayer();
      return;
    }
    
    initLocalOfflineConnection(false);
  }

  function initLocalOfflineConnection(isHostRole) {
    console.log("Initializing Local Offline Connection (Tab-to-Tab)...");
    isHost = isHostRole;
    liveConnectionBoard.style.display = 'block';
    lblConnectionStatus.textContent = 'Offline Mode: Connecting tabs...';
    lblPeerDetails.textContent = 'Connecting via browser BroadcastChannel...';
    connectionStatusDot.style.background = '#e9c46a';

    const myId = isHostRole ? 'host' : 'guest';
    localChannel = new BroadcastChannel('sing-together-offline-sync');
    
    // Create standard RTCPeerConnection
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    const pcInstance = new RTCPeerConnection(configuration);
    
    // Track connection state
    pcInstance.onconnectionstatechange = () => {
      console.log("WebRTC connection state:", pcInstance.connectionState);
      if (pcInstance.connectionState === 'connected') {
        lblConnectionStatus.textContent = 'Voice & Video Connected (Offline Mode)!';
        lblPeerDetails.textContent = 'Connected locally between tabs.';
        connectionStatusDot.style.background = '#2a9d8f';
      } else if (pcInstance.connectionState === 'failed' || pcInstance.connectionState === 'disconnected') {
        disconnectMultiplayer();
      }
    };

    // Attach local stream
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(track => pcInstance.addTrack(track, localMediaStream));
    }

    // Capture remote stream
    pcInstance.ontrack = (event) => {
      console.log("Remote track received:", event.streams[0]);
      remoteStream = event.streams[0];
      window.audioEngine.addRemoteStream(remoteStream);
      
      const remoteWrapper = document.getElementById('video-remote').parentElement;
      if (remoteStream && remoteStream.getVideoTracks().length > 0) {
        document.getElementById('video-remote').srcObject = remoteStream;
        remoteWrapper.classList.remove('no-video');
      } else {
        document.getElementById('video-remote').srcObject = null;
        remoteWrapper.classList.add('no-video');
      }
    };

    // ICE candidates exchange
    pcInstance.onicecandidate = (event) => {
      if (event.candidate) {
        localChannel.postMessage({
          type: 'ICE_CANDIDATE',
          candidate: event.candidate,
          sender: myId
        });
      }
    };

    // Host setup
    if (isHostRole) {
      // Create Data Channel
      const dataChannel = pcInstance.createDataChannel('sing-together-data');
      setupOfflineDataChannel(dataChannel);
      
      // Create Offer
      pcInstance.createOffer().then(offer => {
        return pcInstance.setLocalDescription(offer);
      }).then(() => {
        localChannel.postMessage({
          type: 'SDP_OFFER',
          sdp: pcInstance.localDescription,
          sender: myId
        });
      });
    } else {
      // Guest setup: listen for data channel
      pcInstance.ondatachannel = (event) => {
        setupOfflineDataChannel(event.channel);
      };
    }

    // Signaling listener
    localChannel.onmessage = async (event) => {
      const { type: msgType, sdp, candidate, sender } = event.data;
      if (sender === myId) return; // ignore our own messages

      try {
        if (msgType === 'SDP_OFFER' && !isHostRole) {
          await pcInstance.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pcInstance.createAnswer();
          await pcInstance.setLocalDescription(answer);
          localChannel.postMessage({
            type: 'SDP_ANSWER',
            sdp: pcInstance.localDescription,
            sender: myId
          });
        } else if (msgType === 'SDP_ANSWER' && isHostRole) {
          await pcInstance.setRemoteDescription(new RTCSessionDescription(sdp));
        } else if (msgType === 'ICE_CANDIDATE') {
          if (candidate) {
            await pcInstance.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (err) {
        console.error("Signaling error:", err);
      }
    };

    // Store WebRTC object references so disconnectMultiplayer cleans them up
    peer = {
      destroy: () => {
        pcInstance.close();
        if (localChannel) {
          localChannel.close();
          localChannel = null;
        }
      }
    };
  }

  function setupOfflineDataChannel(channelInstance) {
    conn = {
      send: (data) => {
        if (channelInstance.readyState === 'open') {
          channelInstance.send(JSON.stringify(data));
        }
      },
      close: () => {
        channelInstance.close();
      },
      on: (event, callback) => {
        if (event === 'data') {
          channelInstance.onmessage = (e) => {
            callback(JSON.parse(e.data));
          };
        } else if (event === 'close') {
          channelInstance.onclose = callback;
        } else if (event === 'open') {
          channelInstance.onopen = callback;
          if (channelInstance.readyState === 'open') {
            callback();
          }
        }
      }
    };

    // Trigger data listeners immediately
    setupDataConnectionListeners();
    
    if (channelInstance.readyState === 'open') {
      console.log("Offline Data Channel is open.");
    } else {
      channelInstance.onopen = () => {
        console.log("Offline Data Channel opened.");
      };
    }
  }

  function setupDataConnectionListeners() {
    conn.on('open', () => {
      console.log("Data connection established with peer.");
      if (isHost) {
        try { conn.send({ type: 'CONNECTED_ALERT', msg: 'Host is connected!' }); } catch(e){}
      }
    });
    
    conn.on('data', (data) => {
      console.log("Data received from peer:", data);
      
      switch (data.type) {
        case 'CONNECTED_ALERT':
          console.log(data.msg);
          break;
          
        case 'START_SONG':
          const targetSong = [...window.songsCatalog, ...customSongs].find(s => s.id === data.songId);
          if (targetSong) {
            activeSingingMode = data.mode;
            launchStudio(targetSong);
          }
          break;
          
        case 'RECORD_SONG':
          if (!isRecording) {
            startRecordingProcess();
          }
          break;
          
        case 'STOP_SONG':
          if (isRecording) {
            finishRecordingReview();
          }
          break;
          
        case 'PITCH_UPDATE':
          remoteUserPitch = data.pitch;
          break;
          
        case 'LEAVE_ROOM':
          alert("Your partner has left the room.");
          disconnectMultiplayer();
          break;
      }
    });
    
    conn.on('close', () => {
      console.log("Data connection closed.");
      alert("Connection to partner lost.");
      disconnectMultiplayer();
    });
  }

  function disconnectMultiplayer() {
    isMatching = false;
    if (btnQuickMatch) btnQuickMatch.style.display = 'block';
    if (btnCancelMatch) btnCancelMatch.style.display = 'none';
    if (matchmakingStatusContainer) matchmakingStatusContainer.style.display = 'none';

    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId);
      connectionTimeoutId = null;
    }

    signalQueue = [];
    remotePartnerUsername = null;

    const lobbyVideoLocal = document.getElementById('lobby-video-local');
    if (lobbyVideoLocal) lobbyVideoLocal.srcObject = null;
    const lobbyVideoRemote = document.getElementById('lobby-video-remote');
    if (lobbyVideoRemote) lobbyVideoRemote.srcObject = null;

    if (conn) {
      try { conn.send({ type: 'LEAVE_ROOM' }); } catch(e){}
      try { conn.close(); } catch(e){}
      conn = null;
    }
    
    if (mediaCall) {
      try { mediaCall.close(); } catch(e){}
      mediaCall = null;
    }
    
    if (peer) {
      try { peer.destroy(); } catch(e){}
      peer = null;
    }

    if (localChannel) {
      try { localChannel.close(); } catch(e){}
      localChannel = null;
    }
    
    window.audioEngine.removeRemoteStream();
    remoteStream = null;
    remoteUserPitch = null;
    
    // Stop local video/mic tracks and clean source objects
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(track => track.stop());
      localMediaStream = null;
    }
    window.audioEngine.micStream = null;
    window.audioEngine.micSource = null;
    micActive = false;
    
    document.getElementById('video-local').srcObject = null;
    document.getElementById('video-remote').srcObject = null;
    document.getElementById('studio-camera-container').style.display = 'none';
    
    btnHostRoom.disabled = false;
    btnHostRoom.innerHTML = '<i class="fa-solid fa-house-chimney-medical"></i> Generate Private Room';
    
    btnJoinRoom.disabled = false;
    btnJoinRoom.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Connect to Private Room';
    
    hostCodeDisplay.style.display = 'none';
    liveConnectionBoard.style.display = 'none';
    inputRoomId.value = '';
    
    if (currentScreen === 'studio') {
      exitStudioSession();
      switchScreen('home');
    }
  }

  // --- USER SESSION & AUTHENTICATION HANDLERS ---
  let loggedInUser = null;

  async function verifyUserSession() {
    const token = localStorage.getItem('sing_together_token');
    if (!token) {
      showAuthScreen();
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.username) {
        loggedInUser = data.username;
        lblUsername.textContent = data.username;
        
        // Show application interface
        screenAuth.classList.remove('active');
        screenAuth.style.display = 'none';
        headerNav.style.display = 'flex';
        userProfileDisplay.style.display = 'flex';
        
        // Connect Socket.io client
        initSocket(data.username);
        
        switchScreen('home');
      } else {
        localStorage.removeItem('sing_together_token');
        showAuthScreen();
      }
    } catch(err) {
      console.error("Session verification failed:", err);
      showAuthScreen();
    }
  }

  function showAuthScreen() {
    loggedInUser = null;
    screenAuth.classList.add('active');
    screenAuth.style.display = 'flex';
    headerNav.style.display = 'none';
    userProfileDisplay.style.display = 'none';
    
    // Hide other screens
    Object.values(screens).forEach(screen => {
      screen.classList.remove('active');
    });
  }

  // Swap Forms Listeners
  linkGotoSignup.addEventListener('click', () => {
    loginFormContainer.style.display = 'none';
    signupFormContainer.style.display = 'block';
    authFeedback.style.display = 'none';
  });

  linkGotoLogin.addEventListener('click', () => {
    loginFormContainer.style.display = 'block';
    signupFormContainer.style.display = 'none';
    authFeedback.style.display = 'none';
  });

  // Login submission
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    authFeedback.style.display = 'none';
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        authFeedback.className = 'success';
        authFeedback.textContent = 'Login successful! Redirecting...';
        authFeedback.style.display = 'block';
        
        localStorage.setItem('sing_together_token', data.token);
        formLogin.reset();
        
        setTimeout(() => {
          verifyUserSession();
        }, 800);
      } else {
        authFeedback.className = 'error';
        authFeedback.textContent = data.error || 'Login failed.';
        authFeedback.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      authFeedback.className = 'error';
      authFeedback.textContent = 'Server unreachable.';
      authFeedback.style.display = 'block';
    }
  });

  // Signup submission
  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault();
    authFeedback.style.display = 'none';
    
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        authFeedback.className = 'success';
        authFeedback.textContent = 'Account created successfully! Logging in...';
        authFeedback.style.display = 'block';
        
        localStorage.setItem('sing_together_token', data.token);
        formSignup.reset();
        
        setTimeout(() => {
          verifyUserSession();
        }, 800);
      } else {
        authFeedback.className = 'error';
        authFeedback.textContent = data.error || 'Signup failed.';
        authFeedback.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      authFeedback.className = 'error';
      authFeedback.textContent = 'Server unreachable.';
      authFeedback.style.display = 'block';
    }
  });

  // Logout routine
  btnLogout.addEventListener('click', () => {
    localStorage.removeItem('sing_together_token');
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    showAuthScreen();
  });

  // --- SOCKET.IO REAL-TIME MATCHMAKING & WEB SYSTEM ---
  let signalQueue = [];

  async function handleIncomingSignal(data) {
    if (!peer) return;
    if (data.sdp) {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === 'offer') {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit('signal', { room: activeRoomName, sdp: peer.localDescription });
        }
      } catch(e) {
        console.error("Error setting remote SDP:", e);
      }
    } else if (data.candidate) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch(e) {
        console.error("Error adding remote ICE candidate:", e);
      }
    }
  }

  function initSocket(username) {
    if (socket) return;
    
    // Connect to local Socket.io signaling server
    socket = io();
    
    socket.on('connect', () => {
      console.log("WebSocket connected. Socket ID:", socket.id);
      socket.emit('register-user', username);
    });

    // Handle incoming WebRTC signaling with queueing to prevent race conditions
    socket.on('signal', async (data) => {
      if (peer) {
        await handleIncomingSignal(data);
      } else {
        console.log("Queueing incoming WebRTC signal:", data);
        signalQueue.push(data);
      }
    });

    // Match found event: starts the WebRTC handshake process
    socket.on('match-found', async (data) => {
      console.log("Match Found event received:", data);
      activeRoomName = data.room;
      isHost = (data.role === 'host');
      remotePartnerUsername = data.partner;
      
      // Stop matchmaking spinners
      btnQuickMatch.style.display = 'block';
      btnCancelMatch.style.display = 'none';
      matchmakingStatusContainer.style.display = 'none';
      isMatching = false;
      
      // Stop private room hosting spinner
      btnHostRoom.disabled = false;
      btnHostRoom.innerHTML = '<i class="fa-solid fa-house-chimney-medical"></i> Generate Private Room';
      hostCodeDisplay.style.display = 'none';
      
      liveConnectionBoard.style.display = 'block';
      lblConnectionStatus.textContent = 'Duet Matching...';
      lblPeerDetails.textContent = `Matched with user: ${data.partner}. Setting up media...`;
      connectionStatusDot.style.background = '#e9c46a';

      // Set immediate lobby labels
      const lblLobbyLocal = document.getElementById('lbl-lobby-local-username');
      if (lblLobbyLocal) {
        lblLobbyLocal.textContent = loggedInUser || 'You';
      }
      const lblLobbyRemote = document.getElementById('lbl-lobby-remote-username');
      if (lblLobbyRemote) {
        lblLobbyRemote.textContent = data.partner || 'Partner';
      }
      
      // Setup WebRTC connection
      await initSocketWebRTC(data.room, data.role);
    });

    socket.on('private-room-created', (roomCode) => {
      lblRoomId.textContent = roomCode;
      hostCodeDisplay.style.display = 'block';
      btnHostRoom.disabled = false;
      btnHostRoom.innerHTML = '<i class="fa-solid fa-house-chimney-medical"></i> Generate Private Room';
      
      liveConnectionBoard.style.display = 'block';
      lblConnectionStatus.textContent = 'Lobby Room Created';
      lblPeerDetails.textContent = `Tell your friend to join room: ${roomCode}`;
      connectionStatusDot.style.background = '#e9c46a';
    });

    socket.on('private-room-error', (msg) => {
      alert(msg);
      disconnectMultiplayer();
    });

    socket.on('partner-left', () => {
      alert("Your partner left the room.");
      disconnectMultiplayer();
    });
  }

  // --- WEBRTC CONNECTION OVER SOCKET.IO SIGNALING ---
  async function initSocketWebRTC(room, role) {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peer = new RTCPeerConnection(configuration);
    
    // Track connection state
    peer.onconnectionstatechange = () => {
      console.log("WebRTC state changed:", peer.connectionState);
      if (peer.connectionState === 'connected') {
        lblConnectionStatus.textContent = 'Voice & Video Connected!';
        lblPeerDetails.textContent = 'Connected. Ready to select song.';
        connectionStatusDot.style.background = '#2a9d8f'; // Green
      } else if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        disconnectMultiplayer();
      }
    };

    // Prompt for camera and mic stream
    let stream;
    try {
      stream = await startLocalMediaStream(true);
      
      // Bind local video
      const localWrapper = document.getElementById('video-local').parentElement;
      const vidLocal = document.getElementById('video-local');
      if (stream.getVideoTracks().length > 0) {
        vidLocal.srcObject = stream;
        vidLocal.play().catch(e => console.log("Local video play failed:", e));
        localWrapper.classList.remove('no-video');
      } else {
        vidLocal.srcObject = null;
        localWrapper.classList.add('no-video');
      }

      // Bind lobby local video and username label
      const lobbyVideoLocal = document.getElementById('lobby-video-local');
      if (lobbyVideoLocal) {
        lobbyVideoLocal.srcObject = stream;
        if (stream.getVideoTracks().length > 0) {
          lobbyVideoLocal.play().catch(e => console.log("Lobby local video play failed:", e));
        }
      }
      const lblLobbyLocal = document.getElementById('lbl-lobby-local-username');
      if (lblLobbyLocal) {
        lblLobbyLocal.textContent = loggedInUser || 'You';
      }
    } catch(err) {
      alert("Microphone and webcam access are required to sing duets.");
      disconnectMultiplayer();
      return;
    }

    // Attach stream tracks to peer connection
    stream.getTracks().forEach(track => peer.addTrack(track, stream));

    // Handle remote stream tracks (robustly built track-by-track for Safari/iOS compatibility)
    peer.ontrack = (event) => {
      console.log("Remote track received:", event.track, event.streams);
      
      if (!remoteStream) {
        remoteStream = new MediaStream();
      }
      remoteStream.addTrack(event.track);
      
      window.audioEngine.addRemoteStream(remoteStream);
      
      const remoteWrapper = document.getElementById('video-remote').parentElement;
      const lobbyVideoRemote = document.getElementById('lobby-video-remote');
      const lobbyRemoteWrapper = lobbyVideoRemote ? lobbyVideoRemote.parentElement : null;
      
      if (remoteStream.getVideoTracks().length > 0) {
        // Bind studio video element
        const vidRemote = document.getElementById('video-remote');
        vidRemote.srcObject = remoteStream;
        vidRemote.play().catch(e => console.log("Studio remote video play failed:", e));
        remoteWrapper.classList.remove('no-video');
        
        // Bind lobby video element
        if (lobbyVideoRemote) {
          lobbyVideoRemote.srcObject = remoteStream;
          lobbyVideoRemote.play().catch(e => console.log("Lobby remote video play failed:", e));
          lobbyRemoteWrapper.classList.remove('no-video');
        }
      } else {
        document.getElementById('video-remote').srcObject = null;
        remoteWrapper.classList.add('no-video');
        
        if (lobbyVideoRemote) {
          lobbyVideoRemote.srcObject = null;
          lobbyRemoteWrapper.classList.add('no-video');
        }
      }

      const lblLobbyRemote = document.getElementById('lbl-lobby-remote-username');
      if (lblLobbyRemote) {
        lblLobbyRemote.textContent = remotePartnerUsername || 'Partner';
      }
    };

    // Forward ICE candidates to signaling server
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', { room, candidate: event.candidate });
      }
    };

    // Process any queued signaling messages that arrived during stream request
    while (signalQueue.length > 0) {
      const queuedData = signalQueue.shift();
      console.log("Processing queued WebRTC signal:", queuedData);
      await handleIncomingSignal(queuedData);
    }

    // Establish channel connection roles
    if (role === 'host') {
      // Host creates the data channel
      const dataChannel = peer.createDataChannel('sing-together-data');
      setupSocketDataChannel(dataChannel);
      
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('signal', { room, sdp: peer.localDescription });
      } catch (err) {
        console.error("Failed to create offer:", err);
      }
    } else {
      // Guest listens for the data channel
      peer.ondatachannel = (event) => {
        setupSocketDataChannel(event.channel);
      };
    }

    // Mock PeerJS destroy method to close WebRTC safely
    peer.destroy = () => {
      peer.close();
      signalQueue = [];
    };
  }

  function setupSocketDataChannel(channelInstance) {
    conn = {
      send: (data) => {
        if (channelInstance.readyState === 'open') {
          channelInstance.send(JSON.stringify(data));
        }
      },
      close: () => {
        channelInstance.close();
      },
      on: (event, callback) => {
        if (event === 'data') {
          channelInstance.onmessage = (e) => {
            callback(JSON.parse(e.data));
          };
        } else if (event === 'close') {
          channelInstance.onclose = callback;
        } else if (event === 'open') {
          channelInstance.onopen = callback;
          if (channelInstance.readyState === 'open') {
            callback();
          }
        }
      }
    };

    // Bind existing lyrics sync and pitch socket listeners in app.js
    setupDataConnectionListeners();
  }

  // --- MATCHMAKING & PRIVATE ROOM TRIGGERS ---
  async function startMatchmaking() {
    if (!socket || !socket.connected) {
      alert("Websocket is disconnected. Please reload the page.");
      return;
    }
    
    disconnectMultiplayer();
    isMatching = true;
    
    btnQuickMatch.style.display = 'none';
    btnCancelMatch.style.display = 'block';
    matchmakingStatusContainer.style.display = 'block';
    lblMatchmakingText.textContent = "Entering matchmaking pool...";
    
    socket.emit('join-matchmaking');
  }

  function cancelMatchmaking() {
    isMatching = false;
    btnQuickMatch.style.display = 'block';
    btnCancelMatch.style.display = 'none';
    matchmakingStatusContainer.style.display = 'none';
    
    if (socket) {
      socket.emit('cancel-matchmaking');
    }
    disconnectMultiplayer();
  }

  function initMultiplayerHost() {
    if (!socket || !socket.connected) {
      alert("Websocket is disconnected. Please reload the page.");
      return;
    }
    disconnectMultiplayer();
    
    btnHostRoom.disabled = true;
    btnHostRoom.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Hosting...';
    
    socket.emit('create-private-room');
  }

  function initMultiplayerJoin() {
    if (!socket || !socket.connected) {
      alert("Websocket is disconnected. Please reload the page.");
      return;
    }
    const targetRoomId = inputRoomId.value.trim();
    if (!targetRoomId) {
      alert("Please enter a valid Private Room ID.");
      return;
    }
    
    disconnectMultiplayer();
    btnJoinRoom.disabled = true;
    btnJoinRoom.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting...';
    
    socket.emit('join-private-room', targetRoomId);
  }

  // Bind Quick Match Controls
  btnQuickMatch.addEventListener('click', startMatchmaking);
  btnCancelMatch.addEventListener('click', cancelMatchmaking);

  // Toggle Private Room Accordion
  togglePrivateRoomHeader.addEventListener('click', () => {
    if (privateRoomLayout.style.display === 'none') {
      privateRoomLayout.style.display = 'grid';
      privateRoomArrow.innerHTML = '<i class="fa-solid fa-chevron-up"></i>';
    } else {
      privateRoomLayout.style.display = 'none';
      privateRoomArrow.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
    }
  });

  // Bind Private Room Buttons
  btnHostRoom.addEventListener('click', initMultiplayerHost);
  btnJoinRoom.addEventListener('click', initMultiplayerJoin);
  btnDisconnectLive.addEventListener('click', disconnectMultiplayer);
  btnCopyRoomId.addEventListener('click', () => {
    navigator.clipboard.writeText(lblRoomId.textContent);
    btnCopyRoomId.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => {
      btnCopyRoomId.innerHTML = '<i class="fa-regular fa-copy"></i> Copy ID';
    }, 2000);
  });

  // Initial Load (Session Verification)
  verifyUserSession();
});
