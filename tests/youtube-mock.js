export function fakeYouTube() {
  window.__musicCalls = [];
  window.YT = {
    Player: class {
      constructor(id, options) {
        this.events = options.events;
        window.__musicOptions = options.playerVars;
        this.ids = [];
        this.index = 0;
        this.volume = 45;
        this.frame = document.createElement('iframe');
        this.frame.title = 'यूट्यूब चाचणी';
        this.frame.srcdoc = '<p>गणपतीच्या गाण्यांची चाचणी</p>';
        document.getElementById(id).replaceWith(this.frame);
        window.__musicPlayer = this;
        setTimeout(() => { this.events.onReady({ target: this }); window.__musicReady = true; }, window.__musicReadyDelay || 0);
      }
      cuePlaylist(list, index = 0) {
        this.ids = Array.isArray(list) ? [...list] : ['RYqJ5w-GrfM', 'lvtiy6szfwQ'];
        this.original = [...this.ids];
        this.index = Array.isArray(list) ? index : list.index || 0;
        window.__musicCalls.push(['cue', [...this.ids]]);
        this.cued = false;
        setTimeout(() => {
          this.cued = true;
          this.emit(5);
          if (this.playAfterCue) { this.playAfterCue = false; this.playVideo(); }
        }, 80);
      }
      loadPlaylist(...args) { this.playAfterCue = true; this.cuePlaylist(...args); }
      getIframe() { return this.frame; }
      getPlaylist() { return [...this.ids]; }
      getPlaylistIndex() { return this.index; }
      getCurrentTime() { return 12; }
      playVideo() { window.__musicCalls.push(['play']); if (this.cued) this.emit(1); }
      pauseVideo() { window.__musicCalls.push(['pause']); this.emit(2); }
      nextVideo() { if (this.index + 1 < this.ids.length) { this.index++; this.playVideo(); } }
      previousVideo() { if (this.index > 0) { this.index--; this.playVideo(); } }
      playVideoAt(index) { this.index = index; this.playVideo(); }
      setVolume(value) { this.volume = value; window.__musicCalls.push(['volume', value]); }
      unMute() {}
      setLoop(value) { window.__musicCalls.push(['loop', value]); }
      setShuffle(value) {
        const current = this.ids[this.index];
        this.ids = value ? [...this.ids].reverse() : [...this.original];
        this.index = this.ids.indexOf(current);
      }
      emit(data) { this.events.onStateChange({ target: this, data }); }
      finish() { this.emit(0); this.nextVideo(); }
      error(code) { this.events.onError({ target: this, data: code }); }
      block() { this.events.onAutoplayBlocked({ target: this }); }
      destroy() { this.frame.remove(); }
    },
  };
  window.onYouTubeIframeAPIReady();
}

export async function mockYouTube(page) {
  await page.route('https://www.youtube.com/iframe_api', route => route.fulfill({ contentType: 'application/javascript', body: `(${fakeYouTube.toString()})();` }));
}

export async function mockMultiplayer(page) {
  await page.addInitScript(() => {
    class FakeWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 1;
        this.listeners = {};
        window.__mpMessages = [];
        setTimeout(() => {
          this.dispatchEvent('open');
          this.dispatchEvent('message', { data: JSON.stringify({ type: 'welcome', id: 'test-id', count: 1 }) });
          this.dispatchEvent('message', { data: JSON.stringify({ type: 'visitors', visitors: [] }) });
        }, 10);
      }
      addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
      removeEventListener(type, fn) { if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(f => f !== fn); }
      dispatchEvent(type, event = {}) { (this.listeners[type] || []).forEach(fn => fn(event)); }
      send(data) { window.__mpMessages.push(JSON.parse(data)); }
      close() { this.readyState = 3; this.dispatchEvent('close'); }
    }
    window.WebSocket = FakeWebSocket;
  });
}
