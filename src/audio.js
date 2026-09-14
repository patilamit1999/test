export const DEFAULT_TRACKS = Object.freeze([
  { id: '_op9dPmACsE', title: 'माझा बाप्पा आला', artist: 'झी म्युझिक मराठी' },
  { id: 'RYqJ5w-GrfM', title: 'देवा श्री गणेशा', artist: 'सोनी म्युझिक इंडिया' },
  { id: 'lvtiy6szfwQ', title: 'सुखकर्ता दुःखहर्ता', artist: 'शेमारू भक्ती' },
]);

const videoPattern = /^[A-Za-z0-9_-]{11}$/;
const playlistPattern = /^[A-Za-z0-9_-]{10,100}$/;

export function parseYouTubeSource(value) {
  const message = 'कृपया यूट्यूबच्या गाण्याचा किंवा यादीचा योग्य दुवा द्या.';
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error(message); }
  const host = url.hostname.toLowerCase();
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) throw new Error(message);
  const parts = url.pathname.split('/').filter(Boolean);
  const videoId = host === 'youtu.be' ? parts[0] : url.pathname === '/watch' ? url.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] : null;
  const playlistId = url.searchParams.get('list');
  if ((videoId && !videoPattern.test(videoId)) || (playlistId && !playlistPattern.test(playlistId)) || (!videoId && !playlistId)) throw new Error(message);
  return { videoId: videoId || null, playlistId: playlistId || null };
}

export function playbackError(code) {
  if (code === 100) return 'हे गाणे खाजगी आहे किंवा काढून टाकले आहे. कृपया दुसरे गाणे निवडा.';
  if (code === 101 || code === 150) return 'या गाण्याला बाहेरील संकेतस्थळावर वाजवण्याची परवानगी नाही. पुढील गाणे निवडा किंवा यूट्यूबवर उघडा.';
  if (code === 153) return 'यूट्यूबला ब्राउझरचा संदर्भ पडताळता आला नाही. दुसरा ब्राउझर वापरा किंवा गाणे यूट्यूबवर उघडा.';
  return 'यूट्यूबवर हे गाणे वाजवता आले नाही. इंटरनेट जोडणी तपासा, पुढील गाणे निवडा किंवा यूट्यूबवर उघडा.';
}

let apiPromise;
function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previous = window.onYouTubeIframeAPIReady;
    const finish = error => {
      clearTimeout(timer);
      window.onYouTubeIframeAPIReady = previous;
      if (error) { script.remove(); apiPromise = null; reject(error); }
      else resolve(window.YT);
    };
    const timer = setTimeout(() => finish(new Error('यूट्यूब सुरू होण्यास वेळ लागत आहे. इंटरनेट जोडणी तपासून पुन्हा ‘ऐका’ दाबा.')), 15000);
    window.onYouTubeIframeAPIReady = () => { finish(); previous?.(); };
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => finish(new Error('यूट्यूबशी जोडता आले नाही. इंटरनेट जोडणी किंवा जाहिरात प्रतिबंधक तपासून पुन्हा ‘ऐका’ दाबा.'));
    document.head.append(script);
  });
  return apiPromise;
}

export function createFestivalAudio({ elementId = 'youtube-player', onChange = () => {}, isVisible = () => true } = {}) {
  const state = { ready: false, loading: false, playing: false, status: 'गणपतीची गाणी सुरू करण्यासाठी ‘ऐका’ दाबा.', error: '', index: 0, tracks: DEFAULT_TRACKS.map(track => ({ ...track })), playlistId: null, shuffle: false, volume: 45 };
  const titles = new Map(DEFAULT_TRACKS.map(track => [track.id, track]));
  let player, opening, readyTimer, disposed = false, pendingShuffle = false, playbackRequest = 0, pendingPlayback = null, cuePending = false;
  function notify() { if (!disposed) onChange({ ...state, tracks: state.tracks.map(track => ({ ...track })) }); }
  function syncQueue() {
    const ids = player?.getPlaylist?.();
    if (ids?.length) state.tracks = ids.filter(id => videoPattern.test(id)).map((id, index) => titles.get(id) || { id, title: `यादीतील गाणे ${(index + 1).toLocaleString('mr-IN')}`, artist: 'यूट्यूब' });
    const index = player?.getPlaylistIndex?.();
    if (Number.isInteger(index) && index >= 0 && index < state.tracks.length) state.index = index;
  }
  function queue(autoplay = false, index = state.index, startSeconds = 0) {
    state.index = Math.max(0, Math.min(index, state.tracks.length - 1));
    state.error = '';
    pendingShuffle = state.shuffle;
    cuePending = !autoplay;
    const method = autoplay ? 'loadPlaylist' : 'cuePlaylist';
    player.setLoop(false);
    if (state.playlistId) player[method]({ listType: 'playlist', list: state.playlistId, index: state.index, startSeconds });
    else player[method](state.tracks.map(track => track.id), state.index, startSeconds);
  }
  async function open() {
    if (state.ready) return;
    if (opening) return opening;
    state.loading = true;
    state.error = '';
    state.status = 'यूट्यूबशी जोडत आहोत…';
    notify();
    opening = (async () => {
      const YT = await loadYouTubeAPI();
      if (disposed) return;
      await new Promise((resolve, reject) => {
        readyTimer = setTimeout(() => reject(new Error('यूट्यूबकडून प्रतिसाद मिळाला नाही. इंटरनेट जोडणी तपासून पुन्हा ‘ऐका’ दाबा.')), 15000);
        player = new YT.Player(elementId, {
          width: '100%',
          height: '210',
          videoId: state.tracks[state.index]?.id || DEFAULT_TRACKS[0].id,
          playerVars: { autoplay: 0, controls: 1, playsinline: 1, origin: window.location.origin, rel: 0, hl: 'mr', cc_lang_pref: 'mr' },
          events: {
            onReady(event) {
              clearTimeout(readyTimer);
              if (disposed) return;
              player = event.target;
              player.getIframe?.()?.setAttribute('title', 'यूट्यूबवरील गणपतीची गाणी');
              state.ready = true;
              state.loading = false;
              state.status = 'गाणी तयार आहेत. ‘ऐका’ दाबा किंवा यूट्यूबवरील बटण वापरा.';
              player.setVolume(state.volume);
              queue();
              notify();
              resolve();
            },
            onStateChange(event) {
              if (disposed) return;
              if (event.data === 1 && document.hidden) { pause(); return; }
              if (pendingShuffle && [1, 5].includes(event.data)) { pendingShuffle = false; player.setShuffle(state.shuffle); }
              syncQueue();
              state.playing = event.data === 1;
              if (event.data === 1) {
                state.error = '';
                state.status = 'गाणे सुरू आहे · पुढील गाणे आपोआप सुरू होईल';
              } else if (event.data === 2) state.status = 'गाणे थांबवले आहे';
              else if (event.data === 3) state.status = 'गाणे सुरू होत आहे…';
              else if (event.data === 0) state.status = 'गाणे संपले. दुसरे गाणे निवडा किंवा यादी पुन्हा ऐका.';
              else if (event.data === 5) { cuePending = false; state.status = 'गाणे ऐकण्यासाठी तयार आहे'; }
              notify();
              if (event.data === 5) resumePendingPlayback();
            },
            onError(event) {
              state.playing = false;
              pendingPlayback = null;
              state.error = playbackError(event.data);
              notify();
            },
            onAutoplayBlocked() {
              state.playing = false;
              pendingPlayback = null;
              state.status = 'ब्राउझरने गाणे थांबवले आहे. यूट्यूबच्या दृश्यातील सुरू करण्याचे बटण दाबा.';
              notify();
            },
          },
        });
      });
    })().catch(error => {
      clearTimeout(readyTimer);
      state.loading = false;
      state.ready = false;
      state.playing = false;
      state.error = error.message;
      if (player) {
        player.destroy();
        player = null;
        const host = document.createElement('div');
        host.id = elementId;
        document.getElementById('youtube-frame').replaceChildren(host);
      }
      notify();
    }).finally(() => { opening = null; });
    return opening;
  }
  function resumePendingPlayback() {
    if (!state.ready || cuePending || pendingPlayback !== playbackRequest || disposed || document.hidden) return;
    pendingPlayback = null;
    state.error = '';
    player.playVideo();
    notify();
  }
  function pause() {
    playbackRequest++;
    pendingPlayback = null;
    if (state.ready) player.pauseVideo();
    state.playing = false;
    notify();
  }
  function visibilityChanged() { if (document.hidden) pause(); }
  document.addEventListener('visibilitychange', visibilityChanged);
  return {
    open,
    getState: () => ({ ...state, tracks: state.tracks.map(track => ({ ...track })) }),
    async play() {
      pendingPlayback = ++playbackRequest;
      await open();
      resumePendingPlayback();
    },
    pause,
    toggle() { if (state.playing) pause(); else return this.play(); },
    next() { if (state.ready && state.index < state.tracks.length - 1) { state.error = ''; player.nextVideo(); } },
    previous() { if (state.ready && state.index > 0) { state.error = ''; player.previousVideo(); } },
    select(index) {
      if (!state.ready || !Number.isInteger(index) || index < 0 || index >= state.tracks.length) return;
      state.error = '';
      player.playVideoAt(index);
    },
    setVolume(value) {
      const volume = Number(value);
      if (!Number.isFinite(volume)) return;
      state.volume = Math.max(0, Math.min(100, volume));
      if (state.ready) { player.setVolume(state.volume); if (state.volume > 0) player.unMute(); }
      notify();
    },
    shuffle() {
      if (!state.ready) return;
      state.shuffle = !state.shuffle;
      player.setShuffle(state.shuffle);
      syncQueue();
      notify();
    },
    add(value) {
      const source = parseYouTubeSource(value);
      if (source.playlistId) {
        state.playlistId = source.playlistId;
        state.index = 0;
        state.tracks = [{ id: source.videoId || DEFAULT_TRACKS[0].id, title: 'आपली यूट्यूब गाण्यांची यादी', artist: 'यादीतील गाणी आणत आहोत…' }];
        if (state.ready) queue(state.playing, 0);
      } else {
        if (state.tracks.some(track => track.id === source.videoId)) throw new Error('हे गाणे आपल्या यादीत आधीच आहे.');
        if (state.tracks.length >= 200) throw new Error('आपली यादी भरली आहे. नवीन गाणी जोडण्यापूर्वी मूळ यादी निवडा.');
        const seconds = state.ready ? player.getCurrentTime() : 0;
        state.playlistId = null;
        const track = { id: source.videoId, title: `जोडलेले गाणे ${(state.tracks.length + 1).toLocaleString('mr-IN')}`, artist: 'यूट्यूब' };
        titles.set(track.id, track);
        state.tracks.push(track);
        if (state.ready) queue(state.playing, state.index, seconds);
      }
      notify();
      return source.playlistId ? 'यादी जोडली आहे. यूट्यूबकडून प्रतिसाद मिळाल्यावर गाणी दिसतील.' : 'गाणे आपल्या यादीत जोडले आहे.';
    },
    reset() {
      state.playlistId = null;
      state.shuffle = false;
      state.tracks = DEFAULT_TRACKS.map(track => ({ ...track }));
      state.index = 0;
      if (state.ready) queue(state.playing, 0);
      notify();
    },
    dispose() {
      disposed = true;
      clearTimeout(readyTimer);
      document.removeEventListener('visibilitychange', visibilityChanged);
      player?.destroy();
    },
  };
}
