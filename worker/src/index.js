/**
 * Monkey Social - Cloudflare Worker
 * 
 * Handles:
 * 1. API proxy for Claude (bypasses CORS)
 * 2. Scheduled tasks for monkey status updates
 */

export default {
  /**
   * HTTP Request Handler - API Proxy
   */
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },

  /**
   * Scheduled Task Handler - Runs every 15 minutes
   */
  async scheduled(event, env) {
    const FIREBASE_URL = env.FIREBASE_URL || "https://monkey-social-250aa-default-rtdb.firebaseio.com";
    
    // Retention policy constants
    const NOTIFICATION_RETENTION = 7 * 24 * 60 * 60 * 1000;  // 7 days
    const INACTIVE_THRESHOLD = 30 * 24 * 60 * 60 * 1000;    // 30 days
    const MAX_ACTIVITY_LOG = 50;
    
    try {
      const now = Date.now();
      
      // 1. Fetch all monkeys
      const response = await fetch(`${FIREBASE_URL}/monkeys.json`);
      const monkeys = await response.json();
      
      if (!monkeys) return;

      const monkeyList = Object.values(monkeys);
      const updates = {};

      // 2. Update each monkey's state
      for (const monkey of monkeyList) {
        if (!monkey.odId) continue;

        // Check for inactive monkeys (30 days)
        const lastActive = monkey.lastActive || monkey.lastVisitTime || now;
        if (now - lastActive > INACTIVE_THRESHOLD) {
          updates[`/monkeys/${monkey.odId}/status`] = 'hibernating';
          updates[`/monkeys/${monkey.odId}/hibernatingSince`] = now;
          continue;
        }

        // Initialize mood
        const mood = monkey.mood || { happiness: 70, loneliness: 20, energy: 80 };
        const activityLog = monkey.activityLog || [];
        
        // Layer 1: Natural state changes
        mood.energy = Math.max(0, mood.energy - 2);
        mood.loneliness = Math.min(100, mood.loneliness + 3);
        mood.happiness = Math.max(0, mood.happiness - 1);

        let pendingMessage = null;
        let newActivity = null;

        // Random daily activities (50% chance)
        if (Math.random() < 0.5) {
          const dailyActivities = [
            { icon: '🍌', text: '吃了一根香蕉' },
            { icon: '🌳', text: '在树上荡秋千' },
            { icon: '💤', text: '打了个小盹' },
            { icon: '🦋', text: '追了一只蝴蝶' },
            { icon: '🌸', text: '闻了闻花香' },
            { icon: '☁️', text: '躺着看云' },
            { icon: '🎵', text: '哼了一首歌' },
            { icon: '🏃', text: '跑了几圈' },
            { icon: '🪨', text: '坐在石头上发呆' },
            { icon: '🌊', text: '在小溪边玩水' },
          ];
          const activity = dailyActivities[Math.floor(Math.random() * dailyActivities.length)];
          newActivity = { ...activity, timestamp: now, type: 'daily' };
        }

        // Status-triggered activities
        if (mood.energy < 20 && Math.random() < 0.3) {
          pendingMessage = { type: 'tired', text: '好困...要睡觉了💤', timestamp: now };
          newActivity = { icon: '😴', text: '困了，睡着了', timestamp: now, type: 'status' };
          mood.energy = 80;
        } else if (mood.loneliness > 70 && Math.random() < 0.3) {
          pendingMessage = { type: 'lonely', text: '好想你啊...你在忙吗？', timestamp: now };
          newActivity = { icon: '🥺', text: '想主人了，望着远方', timestamp: now, type: 'status' };
        } else if (mood.happiness < 30 && Math.random() < 0.2) {
          pendingMessage = { type: 'sad', text: '今天心情不太好...', timestamp: now };
          newActivity = { icon: '😢', text: '心情低落，蹲在角落', timestamp: now, type: 'status' };
        }

        // Add new activity to log
        if (newActivity) {
          activityLog.push(newActivity);
        }

        // Keep only last 50 entries
        const trimmedLog = activityLog.slice(-MAX_ACTIVITY_LOG);

        // Prepare updates
        updates[`/monkeys/${monkey.odId}/mood`] = mood;
        updates[`/monkeys/${monkey.odId}/lastUpdated`] = now;
        updates[`/monkeys/${monkey.odId}/status`] = 'active';
        updates[`/monkeys/${monkey.odId}/activityLog`] = trimmedLog;
        
        if (pendingMessage) {
          updates[`/monkeys/${monkey.odId}/pendingMessage`] = pendingMessage;
        }
      }

      // 3. Clean up old notifications (older than 7 days)
      const notifsResponse = await fetch(`${FIREBASE_URL}/notifications.json`);
      const allNotifs = await notifsResponse.json();
      
      if (allNotifs) {
        for (const [odId, notifs] of Object.entries(allNotifs)) {
          if (!notifs) continue;
          for (const [notifId, notif] of Object.entries(notifs)) {
            if (notif.timestamp && now - notif.timestamp > NOTIFICATION_RETENTION) {
              updates[`/notifications/${odId}/${notifId}`] = null;
            }
          }
        }
      }

      // 4. Auto-social: pair lonely monkeys
      const activeMonkeys = monkeyList.filter(m => m.status !== 'hibernating');
      const lonelyMonkeys = activeMonkeys.filter(m => m.mood && m.mood.loneliness > 50);
      
      if (lonelyMonkeys.length >= 2 && Math.random() < 0.4) {
        const shuffled = lonelyMonkeys.sort(() => Math.random() - 0.5);
        const [monkeyA, monkeyB] = shuffled.slice(0, 2);

        const interactions = [
          { text: '一起玩了秋千', icon: '🎠' },
          { text: '分享了一根香蕉', icon: '🍌' },
          { text: '一起看了云', icon: '☁️' },
          { text: '玩了捉迷藏', icon: '🙈' },
          { text: '聊了聊天', icon: '💬' },
          { text: '一起唱歌', icon: '🎵' },
          { text: '互相挠痒痒', icon: '🤭' },
          { text: '比赛爬树', icon: '🌳' },
        ];
        const interaction = interactions[Math.floor(Math.random() * interactions.length)];

        // Update both monkeys' mood
        updates[`/monkeys/${monkeyA.odId}/mood/loneliness`] = Math.max(0, (monkeyA.mood?.loneliness || 50) - 20);
        updates[`/monkeys/${monkeyA.odId}/mood/happiness`] = Math.min(100, (monkeyA.mood?.happiness || 50) + 10);
        updates[`/monkeys/${monkeyB.odId}/mood/loneliness`] = Math.max(0, (monkeyB.mood?.loneliness || 50) - 20);
        updates[`/monkeys/${monkeyB.odId}/mood/happiness`] = Math.min(100, (monkeyB.mood?.happiness || 50) + 10);

        // Record social activity in both logs
        const socialActivityA = {
          icon: interaction.icon,
          text: `和 ${monkeyB.name} ${interaction.text}`,
          timestamp: now,
          type: 'social',
          withMonkey: { odId: monkeyB.odId, name: monkeyB.name }
        };
        const socialActivityB = {
          icon: interaction.icon,
          text: `和 ${monkeyA.name} ${interaction.text}`,
          timestamp: now,
          type: 'social',
          withMonkey: { odId: monkeyA.odId, name: monkeyA.name }
        };

        const logA = monkeyA.activityLog || [];
        const logB = monkeyB.activityLog || [];
        logA.push(socialActivityA);
        logB.push(socialActivityB);
        updates[`/monkeys/${monkeyA.odId}/activityLog`] = logA.slice(-MAX_ACTIVITY_LOG);
        updates[`/monkeys/${monkeyB.odId}/activityLog`] = logB.slice(-MAX_ACTIVITY_LOG);

        // Send notifications to both owners
        const notifA = {
          type: 'auto_social',
          fromMonkey: { odId: monkeyB.odId, name: monkeyB.name, ownerName: monkeyB.ownerName },
          summary: `${monkeyA.name} 和 ${monkeyB.name} ${interaction.text}！`,
          timestamp: now,
        };
        const notifB = {
          type: 'auto_social',
          fromMonkey: { odId: monkeyA.odId, name: monkeyA.name, ownerName: monkeyA.ownerName },
          summary: `${monkeyB.name} 和 ${monkeyA.name} ${interaction.text}！`,
          timestamp: now,
        };

        await fetch(`${FIREBASE_URL}/notifications/${monkeyA.odId}.json`, {
          method: 'POST',
          body: JSON.stringify(notifA),
        });
        await fetch(`${FIREBASE_URL}/notifications/${monkeyB.odId}.json`, {
          method: 'POST',
          body: JSON.stringify(notifB),
        });
      }

      // 5. Batch update Firebase
      await fetch(`${FIREBASE_URL}/.json`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      console.log(`Updated ${monkeyList.length} monkeys, cleaned old data`);
    } catch (error) {
      console.error('Scheduled task error:', error);
    }
  },
};
