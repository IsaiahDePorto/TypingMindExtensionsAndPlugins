(function () {
  const TAG = "[TM Gemini Diagnostic]";
  const seen = { fetch: 0, xhr: 0, worker: 0 };

  // Visible indicator so we don't depend on console
  const badge = document.createElement("div");
  badge.id = "tm-gemini-diag-badge";
  badge.style.cssText = `
    position: fixed; z-index: 999999;
    bottom: 12px; right: 12px;
    font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Arial;
    background: rgba(0,0,0,0.75);
    color: #fff; padding: 8px 10px; border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.15);
    max-width: 60vw;
  `;
  function renderBadge(extra = "") {
    badge.textContent =
      `${TAG} v1` +
      ` | fetch:${seen.fetch} xhr:${seen.xhr} worker:${seen.worker}` +
      (extra ? ` | ${extra}` : "");
  }
  renderBadge("loaded");
  document.documentElement.appendChild(badge);

  // 1) Log Worker creation (very important)
  const OriginalWorker = window.Worker;
  window.Worker = function (scriptURL, options) {
    seen.worker++;
    renderBadge(`Worker(${options?.type || "classic"})`);
    console.log(TAG, "Worker created:", scriptURL, options);
    return new OriginalWorker(scriptURL, options);
  };

  // 2) Log fetch calls to Gemini endpoint
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input?.url || "");
    if (url.includes("generativelanguage.googleapis.com")) {
      seen.fetch++;
      renderBadge("fetch→Gemini");
      console.log(TAG, "fetch→Gemini", { url, method: init?.method, hasBody: !!init?.body });
    }
    return originalFetch.apply(this, arguments);
  };

  // 3) Log XHR calls to Gemini endpoint
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__tm_diag = { method, url };
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const url = this.__tm_diag?.url || "";
    if (typeof url === "string" && url.includes("generativelanguage.googleapis.com")) {
      seen.xhr++;
      renderBadge("xhr→Gemini");
      console.log(TAG, "xhr→Gemini", {
        url,
        method: this.__tm_diag?.method,
        bodyType: typeof body,
      });
    }
    return origSend.apply(this, arguments);
  };

  console.log(TAG, "Diagnostic extension running. If you don't see this, your updated code isn't being reloaded.");
})();
