// songs.js - Song catalog and synthetic sequencer definitions
const SONG_CATALOG = [
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    genre: 'Classical',
    difficulty: 'Easy',
    tempo: 120,
    synthData: {
      notes: [
        // Measure 1
        { pitch: 'E4', time: 0.0, duration: 0.5 },
        { pitch: 'E4', time: 0.5, duration: 0.5 },
        { pitch: 'F4', time: 1.0, duration: 0.5 },
        { pitch: 'G4', time: 1.5, duration: 0.5 },
        // Measure 2
        { pitch: 'G4', time: 2.0, duration: 0.5 },
        { pitch: 'F4', time: 2.5, duration: 0.5 },
        { pitch: 'E4', time: 3.0, duration: 0.5 },
        { pitch: 'D4', time: 3.5, duration: 0.5 },
        // Measure 3
        { pitch: 'C4', time: 4.0, duration: 0.5 },
        { pitch: 'C4', time: 4.5, duration: 0.5 },
        { pitch: 'D4', time: 5.0, duration: 0.5 },
        { pitch: 'E4', time: 5.5, duration: 0.5 },
        // Measure 4
        { pitch: 'E4', time: 6.0, duration: 0.75 },
        { pitch: 'D4', time: 6.75, duration: 0.25 },
        { pitch: 'D4', time: 7.0, duration: 1.0 },

        // Measure 5
        { pitch: 'E4', time: 8.0, duration: 0.5 },
        { pitch: 'E4', time: 8.5, duration: 0.5 },
        { pitch: 'F4', time: 9.0, duration: 0.5 },
        { pitch: 'G4', time: 9.5, duration: 0.5 },
        // Measure 6
        { pitch: 'G4', time: 10.0, duration: 0.5 },
        { pitch: 'F4', time: 10.5, duration: 0.5 },
        { pitch: 'E4', time: 11.0, duration: 0.5 },
        { pitch: 'D4', time: 11.5, duration: 0.5 },
        // Measure 7
        { pitch: 'C4', time: 12.0, duration: 0.5 },
        { pitch: 'C4', time: 12.5, duration: 0.5 },
        { pitch: 'D4', time: 13.0, duration: 0.5 },
        { pitch: 'E4', time: 13.5, duration: 0.5 },
        // Measure 8
        { pitch: 'D4', time: 14.0, duration: 0.75 },
        { pitch: 'C4', time: 14.75, duration: 0.25 },
        { pitch: 'C4', time: 15.0, duration: 1.0 },

        // Measure 9 (Bridge)
        { pitch: 'D4', time: 16.0, duration: 0.5 },
        { pitch: 'D4', time: 16.5, duration: 0.5 },
        { pitch: 'E4', time: 17.0, duration: 0.5 },
        { pitch: 'C4', time: 17.5, duration: 0.5 },
        // Measure 10
        { pitch: 'D4', time: 18.0, duration: 0.5 },
        { pitch: 'E4', time: 18.5, duration: 0.25 },
        { pitch: 'F4', time: 18.75, duration: 0.25 },
        { pitch: 'E4', time: 19.0, duration: 0.5 },
        { pitch: 'C4', time: 19.5, duration: 0.5 },
        // Measure 11
        { pitch: 'D4', time: 20.0, duration: 0.5 },
        { pitch: 'E4', time: 20.5, duration: 0.25 },
        { pitch: 'F4', time: 20.75, duration: 0.25 },
        { pitch: 'E4', time: 21.0, duration: 0.5 },
        { pitch: 'D4', time: 21.5, duration: 0.5 },
        // Measure 12
        { pitch: 'C4', time: 22.0, duration: 0.5 },
        { pitch: 'D4', time: 22.5, duration: 0.5 },
        { pitch: 'G3', time: 23.0, duration: 1.0 },

        // Measure 13 (Repeat Theme)
        { pitch: 'E4', time: 24.0, duration: 0.5 },
        { pitch: 'E4', time: 24.5, duration: 0.5 },
        { pitch: 'F4', time: 25.0, duration: 0.5 },
        { pitch: 'G4', time: 25.5, duration: 0.5 },
        // Measure 14
        { pitch: 'G4', time: 26.0, duration: 0.5 },
        { pitch: 'F4', time: 26.5, duration: 0.5 },
        { pitch: 'E4', time: 27.0, duration: 0.5 },
        { pitch: 'D4', time: 27.5, duration: 0.5 },
        // Measure 15
        { pitch: 'C4', time: 28.0, duration: 0.5 },
        { pitch: 'C4', time: 28.5, duration: 0.5 },
        { pitch: 'D4', time: 29.0, duration: 0.5 },
        { pitch: 'E4', time: 29.5, duration: 0.5 },
        // Measure 16
        { pitch: 'D4', time: 30.0, duration: 0.75 },
        { pitch: 'C4', time: 30.75, duration: 0.25 },
        { pitch: 'C4', time: 31.0, duration: 1.0 }
      ],
      chords: [
        { notes: ['C3', 'E3', 'G3'], time: 0.0, duration: 2.0 },
        { notes: ['G2', 'B2', 'D3'], time: 2.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 4.0, duration: 2.0 },
        { notes: ['G2', 'B2', 'D3'], time: 6.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 8.0, duration: 2.0 },
        { notes: ['G2', 'B2', 'D3'], time: 10.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 12.0, duration: 2.0 },
        { notes: ['G2', 'C3', 'E3'], time: 14.0, duration: 2.0 },
        // Bridge
        { notes: ['G2', 'B2', 'D3'], time: 16.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 18.0, duration: 2.0 },
        { notes: ['G2', 'B2', 'D3'], time: 20.0, duration: 2.0 },
        { notes: ['C3', 'F3', 'A3'], time: 22.0, duration: 2.0 },
        // Outro
        { notes: ['C3', 'E3', 'G3'], time: 24.0, duration: 2.0 },
        { notes: ['G2', 'B2', 'D3'], time: 26.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 28.0, duration: 2.0 },
        { notes: ['G2', 'C3', 'E3'], time: 30.0, duration: 2.0 }
      ]
    },
    lyrics: [
      { time: 0.0, text: "Joyful, joyful, we adore Thee,", part: 'A' },
      { time: 2.0, text: "God of glory, Lord of love;", part: 'A' },
      { time: 4.0, text: "Hearts unfold like flowers before Thee,", part: 'B' },
      { time: 6.0, text: "Opening to the sun above.", part: 'B' },
      { time: 8.0, text: "Melt the clouds of sin and sadness,", part: 'A' },
      { time: 10.0, text: "Drive the dark of doubt away;", part: 'B' },
      { time: 12.0, text: "Giver of immortal gladness,", part: 'Duet' },
      { time: 14.0, text: "Fill us with the light of day!", part: 'Duet' },
      // Bridge
      { time: 16.0, text: "All Thy works with joy surround Thee,", part: 'A' },
      { time: 18.0, text: "Earth and heaven reflect Thy rays,", part: 'A' },
      { time: 20.0, text: "Stars and angels sing around Thee,", part: 'B' },
      { time: 22.0, text: "Center of unbroken praise.", part: 'B' },
      // Verse repeat
      { time: 24.0, text: "Field and forest, vale and mountain,", part: 'A' },
      { time: 26.0, text: "Flowery meadow, flashing sea,", part: 'B' },
      { time: 28.0, text: "Chanting bird and flowing fountain,", part: 'Duet' },
      { time: 30.0, text: "Call us to rejoice in Thee.", part: 'Duet' }
    ]
  },
  {
    id: 'twinkle-twinkle',
    title: 'Twinkle Twinkle Little Star',
    artist: 'Jane Taylor',
    genre: 'Children',
    difficulty: 'Easy',
    tempo: 100,
    synthData: {
      notes: [
        { pitch: 'C4', time: 0.0, duration: 0.5 },
        { pitch: 'C4', time: 0.5, duration: 0.5 },
        { pitch: 'G4', time: 1.0, duration: 0.5 },
        { pitch: 'G4', time: 1.5, duration: 0.5 },
        { pitch: 'A4', time: 2.0, duration: 0.5 },
        { pitch: 'A4', time: 2.5, duration: 0.5 },
        { pitch: 'G4', time: 3.0, duration: 1.0 },

        { pitch: 'F4', time: 4.0, duration: 0.5 },
        { pitch: 'F4', time: 4.5, duration: 0.5 },
        { pitch: 'E4', time: 5.0, duration: 0.5 },
        { pitch: 'E4', time: 5.5, duration: 0.5 },
        { pitch: 'D4', time: 6.0, duration: 0.5 },
        { pitch: 'D4', time: 6.5, duration: 0.5 },
        { pitch: 'C4', time: 7.0, duration: 1.0 },

        { pitch: 'G4', time: 8.0, duration: 0.5 },
        { pitch: 'G4', time: 8.5, duration: 0.5 },
        { pitch: 'F4', time: 9.0, duration: 0.5 },
        { pitch: 'F4', time: 9.5, duration: 0.5 },
        { pitch: 'E4', time: 10.0, duration: 0.5 },
        { pitch: 'E4', time: 10.5, duration: 0.5 },
        { pitch: 'D4', time: 11.0, duration: 1.0 },

        { pitch: 'G4', time: 12.0, duration: 0.5 },
        { pitch: 'G4', time: 12.5, duration: 0.5 },
        { pitch: 'F4', time: 13.0, duration: 0.5 },
        { pitch: 'F4', time: 13.5, duration: 0.5 },
        { pitch: 'E4', time: 14.0, duration: 0.5 },
        { pitch: 'E4', time: 14.5, duration: 0.5 },
        { pitch: 'D4', time: 15.0, duration: 1.0 },

        { pitch: 'C4', time: 16.0, duration: 0.5 },
        { pitch: 'C4', time: 16.5, duration: 0.5 },
        { pitch: 'G4', time: 17.0, duration: 0.5 },
        { pitch: 'G4', time: 17.5, duration: 0.5 },
        { pitch: 'A4', time: 18.0, duration: 0.5 },
        { pitch: 'A4', time: 18.5, duration: 0.5 },
        { pitch: 'G4', time: 19.0, duration: 1.0 },

        { pitch: 'F4', time: 20.0, duration: 0.5 },
        { pitch: 'F4', time: 20.5, duration: 0.5 },
        { pitch: 'E4', time: 21.0, duration: 0.5 },
        { pitch: 'E4', time: 21.5, duration: 0.5 },
        { pitch: 'D4', time: 22.0, duration: 0.5 },
        { pitch: 'D4', time: 22.5, duration: 0.5 },
        { pitch: 'C4', time: 23.0, duration: 1.0 }
      ],
      chords: [
        { notes: ['C3', 'E3', 'G3'], time: 0.0, duration: 2.0 },
        { notes: ['F3', 'A3', 'C4'], time: 2.0, duration: 1.0 },
        { notes: ['C3', 'E3', 'G3'], time: 3.0, duration: 1.0 },
        { notes: ['F3', 'A3', 'C4'], time: 4.0, duration: 2.0 },
        { notes: ['G3', 'B3', 'D4'], time: 6.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 8.0, duration: 2.0 },
        { notes: ['G3', 'B3', 'D4'], time: 10.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 12.0, duration: 2.0 },
        { notes: ['G3', 'B3', 'D4'], time: 14.0, duration: 2.0 },
        { notes: ['C3', 'E3', 'G3'], time: 16.0, duration: 2.0 },
        { notes: ['F3', 'A3', 'C4'], time: 18.0, duration: 2.0 },
        { notes: ['F3', 'A3', 'C4'], time: 20.0, duration: 2.0 },
        { notes: ['G3', 'B3', 'D4'], time: 22.0, duration: 2.0 }
      ]
    },
    lyrics: [
      { time: 0.0, text: "Twinkle, twinkle, little star,", part: 'A' },
      { time: 2.0, text: "How I wonder what you are!", part: 'A' },
      { time: 4.0, text: "Up above the world so high,", part: 'B' },
      { time: 6.0, text: "Like a diamond in the sky.", part: 'B' },
      { time: 8.0, text: "When the blazing sun is gone,", part: 'A' },
      { time: 10.0, text: "When he nothing shines upon,", part: 'A' },
      { time: 12.0, text: "Then you show your little light,", part: 'B' },
      { time: 14.0, text: "Twinkle, twinkle, all the night.", part: 'B' },
      { time: 16.0, text: "Twinkle, twinkle, little star,", part: 'Duet' },
      { time: 18.0, text: "How I wonder what you are!", part: 'Duet' }
    ]
  },
  {
    id: 'retro-synth-love',
    title: 'Retro Synth Love',
    artist: 'Neon Antigravity',
    genre: 'Electronic',
    difficulty: 'Medium',
    tempo: 125,
    synthData: {
      notes: [
        // Bassline synth loop
        { pitch: 'A3', time: 0.0, duration: 0.5 },
        { pitch: 'C4', time: 0.5, duration: 0.5 },
        { pitch: 'E4', time: 1.0, duration: 0.5 },
        { pitch: 'G4', time: 1.5, duration: 0.5 },
        { pitch: 'A4', time: 2.0, duration: 1.0 },
        { pitch: 'G4', time: 3.0, duration: 1.0 },

        { pitch: 'F3', time: 4.0, duration: 0.5 },
        { pitch: 'A3', time: 4.5, duration: 0.5 },
        { pitch: 'C4', time: 5.0, duration: 0.5 },
        { pitch: 'E4', time: 5.5, duration: 0.5 },
        { pitch: 'F4', time: 6.0, duration: 1.0 },
        { pitch: 'E4', time: 7.0, duration: 1.0 },

        { pitch: 'D3', time: 8.0, duration: 0.5 },
        { pitch: 'F3', time: 8.5, duration: 0.5 },
        { pitch: 'A3', time: 9.0, duration: 0.5 },
        { pitch: 'C4', time: 9.5, duration: 0.5 },
        { pitch: 'D4', time: 10.0, duration: 1.0 },
        { pitch: 'C4', time: 11.0, duration: 1.0 },

        { pitch: 'E3', time: 12.0, duration: 0.5 },
        { pitch: 'G3', time: 12.5, duration: 0.5 },
        { pitch: 'B3', time: 13.0, duration: 0.5 },
        { pitch: 'D4', time: 13.5, duration: 0.5 },
        { pitch: 'E4', time: 14.0, duration: 1.0 },
        { pitch: 'D4', time: 15.0, duration: 1.0 },

        // Chorus melody repeat
        { pitch: 'A4', time: 16.0, duration: 0.5 },
        { pitch: 'A4', time: 16.5, duration: 0.5 },
        { pitch: 'G4', time: 17.0, duration: 0.5 },
        { pitch: 'E4', time: 17.5, duration: 0.5 },
        { pitch: 'G4', time: 18.0, duration: 1.0 },
        { pitch: 'A4', time: 19.0, duration: 1.0 },

        { pitch: 'F4', time: 20.0, duration: 0.5 },
        { pitch: 'F4', time: 20.5, duration: 0.5 },
        { pitch: 'E4', time: 21.0, duration: 0.5 },
        { pitch: 'C4', time: 21.5, duration: 0.5 },
        { pitch: 'E4', time: 22.0, duration: 1.0 },
        { pitch: 'F4', time: 23.0, duration: 1.0 },

        { pitch: 'D4', time: 24.0, duration: 0.5 },
        { pitch: 'D4', time: 24.5, duration: 0.5 },
        { pitch: 'C4', time: 25.0, duration: 0.5 },
        { pitch: 'A3', time: 25.5, duration: 0.5 },
        { pitch: 'C4', time: 26.0, duration: 1.0 },
        { pitch: 'D4', time: 27.0, duration: 1.0 },

        { pitch: 'E4', time: 28.0, duration: 0.5 },
        { pitch: 'G4', time: 28.5, duration: 0.5 },
        { pitch: 'A4', time: 29.0, duration: 0.5 },
        { pitch: 'C5', time: 29.5, duration: 0.5 },
        { pitch: 'A4', time: 30.0, duration: 2.0 }
      ],
      chords: [
        { notes: ['A2', 'E3', 'A3'], time: 0.0, duration: 4.0 },
        { notes: ['F2', 'C3', 'F3'], time: 4.0, duration: 4.0 },
        { notes: ['D2', 'A2', 'D3'], time: 8.0, duration: 4.0 },
        { notes: ['E2', 'B2', 'E3'], time: 12.0, duration: 4.0 },
        { notes: ['A2', 'E3', 'A3'], time: 16.0, duration: 4.0 },
        { notes: ['F2', 'C3', 'F3'], time: 20.0, duration: 4.0 },
        { notes: ['D2', 'A2', 'D3'], time: 24.0, duration: 4.0 },
        { notes: ['E2', 'B2', 'E3'], time: 28.0, duration: 4.0 }
      ]
    },
    lyrics: [
      { time: 0.0, text: "Walking down the neon street at midnight,", part: 'A' },
      { time: 4.0, text: "Shadows dancing in the electric light,", part: 'B' },
      { time: 8.0, text: "I can feel the bassline in my heartbeat,", part: 'A' },
      { time: 12.0, text: "Telling me that everything will be alright.", part: 'B' },
      // Chorus
      { time: 16.0, text: "Oh, retro synth love, carry me away,", part: 'Duet' },
      { time: 20.0, text: "Into the sunrise, to a brand new day,", part: 'Duet' },
      { time: 24.0, text: "We don't need words when the keys begin to play,", part: 'A' },
      { time: 28.0, text: "We will just sing, and let it stay!", part: 'Duet' }
    ]
  }
];

// Helper to convert note names (e.g., 'C4', 'A#3') to frequencies
const NOTE_FREQS = {
  'G2': 98.00, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00
};

function noteToFreq(noteName) {
  return NOTE_FREQS[noteName] || 440.0;
}

window.songsCatalog = SONG_CATALOG;
window.noteToFreq = noteToFreq;
