// db.js - IndexedDB storage for Sing Together Karaoke Application
const DB_NAME = 'SingTogetherDB';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

class KaraokeDatabase {
  constructor() {
    this.db = null;
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('Database failed to open:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async saveRecording(recording) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const data = {
        songId: recording.songId,
        title: recording.title,
        artist: recording.artist,
        date: new Date().toISOString(),
        duration: recording.duration,
        audioBlob: recording.audioBlob, // Blob of mixed vocal + instrumental
        type: recording.type || 'solo', // 'solo', 'duet-part-a', 'duet-part-b', 'duet-mixed'
        score: recording.score || 0
      };

      const request = store.add(data);

      request.onsuccess = (event) => {
        resolve(event.target.result); // Returns the auto-incremented ID
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async getAllRecordings() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => {
        // Sort by date descending
        const data = event.target.result;
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        resolve(data);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async deleteRecording(id) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
}

// Export database instance globally for easy import/access
window.karaokeDb = new KaraokeDatabase();
window.karaokeDb.init().catch(console.error);
