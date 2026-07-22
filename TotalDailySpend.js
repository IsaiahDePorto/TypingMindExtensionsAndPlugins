(function() {
  // CSS Injection
  const style = document.createElement('style');
  style.textContent = `
    #tm-daily-spend-widget {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 10000;
      background-color: #1e1e1e;
      color: #ffffff;
      padding: 10px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      width: 200px;
      border: 1px solid #333;
    }
    #tm-daily-spend-bar-container {
      width: 100%;
      height: 10px;
      background-color: #333;
      border-radius: 5px;
      margin-top: 8px;
      overflow: hidden;
    }
    #tm-daily-spend-bar {
      height: 100%;
      width: 0%;
      background-color: rgb(0, 100, 0);
      transition: width 0.5s, background-color 0.5s;
    }
    .tm-spend-text {
      display: flex;
      justify-content: space-between;
    }
  `;
  document.head.appendChild(style);

  // IndexedDB Helpers
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('keyval-store');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function getChats(db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['keyval'], 'readonly');
      const store = transaction.objectStore('keyval');
      const chats = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (typeof cursor.key === 'string' && cursor.key.startsWith('CHAT_')) {
            chats.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(chats);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Spend Calculation
  async function calculateDailySpend() {
    try {
      const db = await openDB();
      const chats = await getChats(db);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      let totalSpend = 0;
      let debugLogged = false;

      for (const chat of chats) {
        // Optimization: check if chat was updated today.
        // If not, messages couldn't have been sent today (unless system clock changed, but we assume standard behavior)
        // Check updatedAt if available
        let updatedTime = new Date(chat.updatedAt).getTime();
        if (isNaN(updatedTime)) updatedTime = new Date(chat.createdAt).getTime(); // Fallback

        if (updatedTime < startOfDay) continue;

        const messages = chat.messages || chat.conversation || [];
        for (const message of messages) {
            // Check message time
            let msgTime = message.createdAt || message.timestamp;
            if (!msgTime) continue; // Skip if no time

            if (new Date(msgTime).getTime() >= startOfDay) {
                // Check cost
                if (message.tokenUsage && typeof message.tokenUsage === 'object') {
                    if (message.tokenUsage.cost) {
                        totalSpend += parseFloat(message.tokenUsage.cost) || 0;
                    } else if (!debugLogged) {
                         // Only log the first missing cost to avoid spamming console
                         console.log("TotalDailySpend: No 'cost' key in tokenUsage for message", message.tokenUsage);
                         debugLogged = true;
                    }
                }
            }
        }
      }

      updateUI(totalSpend);
    } catch (e) {
      console.error("TotalDailySpend Error:", e);
    }
  }

  // UI Updates
  function updateUI(spend) {
    let widget = document.getElementById('tm-daily-spend-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'tm-daily-spend-widget';
      widget.innerHTML = `
        <div class="tm-spend-text">
            <span>Today's Spend</span>
            <span id="tm-daily-spend-value">$0.00</span>
        </div>
        <div id="tm-daily-spend-bar-container">
            <div id="tm-daily-spend-bar"></div>
        </div>
      `;
      document.body.appendChild(widget);
    }

    const valueEl = document.getElementById('tm-daily-spend-value');
    const barEl = document.getElementById('tm-daily-spend-bar');

    valueEl.textContent = `$${spend.toFixed(2)}`;

    // Cap at $1.00 for bar width 100%
    const percentage = Math.min((spend / 1.0) * 100, 100);
    barEl.style.width = `${percentage}%`;

    // Color interpolation: Dark Green (0,100,0) to Dark Red (139,0,0)
    // 0% -> Green
    // 100% -> Red
    const r = Math.round((percentage / 100) * 139);
    const g = Math.round(100 - (percentage / 100) * 100);
    const b = 0;

    barEl.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  }

  // Init
  calculateDailySpend();
  setInterval(calculateDailySpend, 10000);
  console.log("TotalDailySpend extension loaded.");
})();
