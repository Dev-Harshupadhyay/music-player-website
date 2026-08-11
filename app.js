/* ─────────────────────────────────────────────────────────────
   Truck Wala — Dynamic Player with Playlist & Single Tabs
   ───────────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);

const el = {
  cover: $('cover'),
  title: $('title'),
  artist: $('artist'),
  play: $('play'),
  playlistBtn: $('playlist-btn'),
  singleBtn: $('single-btn'),
};

let allTracks = [];
let playlistTracks = [];
let singleTracks = [];
let currentMode = 'playlist'; // default mode
let state = {
  pos: 0,
  ready: false,
  playing: false,
  started: false,
};

let yt = null;

/* ── Rendering ───────────────────────────────────────────────── */

function currentTrackList() {
  return currentMode === 'playlist' ? playlistTracks : singleTracks;
}

function currentTrack() {
  const list = currentTrackList();
  return list[state.pos] || list[0];
}

function renderTrack() {
  const t = currentTrack();
  if (!t) return;

  el.title.textContent = t.title;
  el.artist.textContent = t.artist || 'YouTube Stream';
  el.cover.src = t.cover || `https://img.youtube.com/vi/${t.id}/hqdefault.jpg`;
  
  if (state.started) {
    document.title = `${t.title} — Truck Wala`;
  }
}

/* ── Playback Controls ────────────────────────────────────────── */

function go(newPos) {
  const list = currentTrackList();
  const n = list.length;
  state.pos = ((newPos % n) + n) % n;
  renderTrack();
  if (!yt) return;
  state.started = true;
  yt.loadVideoById(currentTrack().id);
}

function toggle() {
  if (!yt || !state.ready) return;
  if (state.playing) {
    yt.pauseVideo();
  } else {
    state.started = true;
    yt.playVideo();
  }
}

el.play.addEventListener('click', toggle);

/* ── Tab Switching Logic (Playlist vs Single Songs) ───────────── */

function switchMode(mode) {
  currentMode = mode;
  state.pos = 0; // reset to first track of that category

  // Update active button styles
  if (mode === 'playlist') {
    el.playlistBtn.classList.add('active');
    el.singleBtn.classList.remove('active');
  } else {
    el.singleBtn.classList.add('active');
    el.playlistBtn.classList.remove('active');
  }

  renderTrack();
  if (yt && state.ready) {
    yt.loadVideoById(currentTrack().id);
    if (state.playing) yt.playVideo();
  }
}

el.playlistBtn.addEventListener('click', () => switchMode('playlist'));
el.singleBtn.addEventListener('click', () => switchMode('single'));

/* ── YouTube iframe boot ─────────────────────────────────────── */

window.onYouTubeIframeAPIReady = () => {
  yt = new YT.Player('yt-player', {
    height: '1',
    width: '1',
    videoId: currentTrack().id,
    playerVars: {
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: () => {
        state.ready = true;
        el.play.disabled = false;
      },
      onStateChange: (e) => {
        const S = YT.PlayerState;
        if (e.data === S.PLAYING) {
          state.playing = true;
          el.play.textContent = '⏸️';
        } else if (e.data === S.PAUSED || e.data === S.BUFFERING) {
          state.playing = (e.data === S.BUFFERING && state.playing);
          el.play.textContent = state.playing ? '⏸️' : '▶️';
        } else if (e.data === S.ENDED) {
          go(state.pos + 1); // Auto play next track
        }
      },
      onError: () => {
        if (state.started) go(state.pos + 1);
      },
    },
  });
};

/* ── Initialization (Load tracks.json) ───────────────────────── */

(async function init() {
  try {
    const res = await fetch('tracks.json');
    allTracks = await res.json();
  } catch {
    el.title.textContent = 'Could not load tracks.json';
    el.artist.textContent = 'Check file path';
    return;
  }

  if (!allTracks.length) {
    el.title.textContent = 'No tracks found';
    return;
  }

  // Divide tracks into Playlists (first 5) and Single Songs (remaining)
  playlistTracks = allTracks.slice(0, 5);
  singleTracks = allTracks.slice(5);

  // Fallback if split is uneven
  if (singleTracks.length === 0) {
    singleTracks = allTracks;
  }

  renderTrack();

  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.append(s);
})();

