/**
 * Firebase Storage Module
 * Handles all Firebase Realtime Database operations
 */

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAt4tlxNegaodi5c4SfHdR7WcZEcWZ5dxI",
  authDomain: "monkey-social-250aa.firebaseapp.com",
  databaseURL: "https://monkey-social-250aa-default-rtdb.firebaseio.com",
  projectId: "monkey-social-250aa",
  storageBucket: "monkey-social-250aa.firebasestorage.app",
  messagingSenderId: "296405488554",
  appId: "1:296405488554:web:7cc767546c7fb5d4b191d3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Storage API
const storage = {
  /**
   * Save monkey to Firebase
   */
  async saveMonkey(monkey) {
    try {
      await db.ref(`monkeys/${monkey.odId}`).set({
        ...monkey,
        lastActive: Date.now()
      });
      localStorage.setItem('my-monkey-id', monkey.odId);
      return true;
    } catch (e) {
      console.error('Save monkey error:', e);
      return false;
    }
  },
  
  /**
   * Get single monkey by ID
   */
  async getMonkey(odId) {
    try {
      const snapshot = await db.ref(`monkeys/${odId}`).once('value');
      return snapshot.val();
    } catch (e) {
      console.error('Get monkey error:', e);
      return null;
    }
  },
  
  /**
   * Subscribe to all monkeys (realtime updates)
   */
  subscribeToMonkeys(callback) {
    const ref = db.ref('monkeys');
    ref.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      callback(Object.values(data));
    });
    return () => ref.off('value');
  },
  
  /**
   * Save relation between monkeys
   */
  async saveRelation(myOdId, friendOdId, relation) {
    try {
      await db.ref(`relations/${myOdId}/${friendOdId}`).set(relation);
      return true;
    } catch (e) {
      console.error('Save relation error:', e);
      return false;
    }
  },
  
  /**
   * Get all relations for a monkey
   */
  async getRelations(myOdId) {
    try {
      const snapshot = await db.ref(`relations/${myOdId}`).once('value');
      const data = snapshot.val() || {};
      return Object.values(data);
    } catch (e) {
      console.error('Get relations error:', e);
      return [];
    }
  },
  
  /**
   * Send notification to another monkey's owner
   */
  async sendNotification(toOdId, notification) {
    try {
      await db.ref(`notifications/${toOdId}`).push({
        ...notification,
        timestamp: Date.now()
      });
      return true;
    } catch (e) {
      console.error('Send notification error:', e);
      return false;
    }
  },
  
  /**
   * Subscribe to notifications (realtime)
   */
  subscribeToNotifications(odId, callback) {
    const ref = db.ref(`notifications/${odId}`);
    ref.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      const notifs = Object.entries(data).map(([id, n]) => ({ id, ...n }));
      notifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(notifs);
    });
    return () => ref.off('value');
  },
  
  /**
   * Delete notification
   */
  async deleteNotification(odId, notifId) {
    try {
      await db.ref(`notifications/${odId}/${notifId}`).remove();
      return true;
    } catch (e) {
      console.error('Delete notification error:', e);
      return false;
    }
  }
};

// Export for use in other modules
window.storage = storage;
window.db = db;
