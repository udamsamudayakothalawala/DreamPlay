const audio = new Audio();
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0;
let playlist = [];
let currentIndex = -1;
let currentSource = 'local'; // 'local' or 'spotify'
let spotifyToken = null;
let spotifyClientId = '';
let searchTimeout = null;

// DOM Elements
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressThumb = document.getElementById('progressThumb');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const songTitle = document.getElementById('songTitle');
const artistName = document.getElementById('artistName');
const albumArt = document.getElementById('albumArt');
const fileInput = document.getElementById('fileInput');
const playlistEl = document.getElementById('playlist');
const playlistToggle = document.getElementById('playlistToggle');
const spotifyToggle = document.getElementById('spotifyToggle');
const playlistPanel = document.getElementById('playlistPanel');
const panelTitle = document.getElementById('panelTitle');
const addMusicBtn = document.getElementById('addMusicBtn');
const spotifySearch = document.getElementById('spotifySearch');
const spotifyInput = document.getElementById('spotifyInput');
const spotifySearchBtn = document.getElementById('spotifySearchBtn');
const spotifyConnect = document.getElementById('spotifyConnect');
const clientIdInput = document.getElementById('clientIdInput');
const spotifyConnectBtn = document.getElementById('spotifyConnectBtn');
const clientSecretInput = document.getElementById('clientSecretInput');
const spotifyCloseBtn = document.getElementById('spotifyCloseBtn');

volumeSlider.addEventListener('input', () => {
    audio.volume = volumeSlider.value / 100;
});
audio.volume = 0.8;

// --- Spotify Auth ---
spotifyToggle.addEventListener('click', () => {
    if (spotifyToken) {
        currentSource = 'spotify';
        spotifyToggle.classList.add('active');
        playlistToggle.classList.remove('active');
        showSpotifyPanel();
    } else {
        spotifyConnect.style.display = 'flex';
    }
});

spotifyConnectBtn.addEventListener('click', () => {
    const clientId = clientIdInput.value.trim();
    const clientSecret = clientSecretInput.value.trim();
    if (!clientId || !clientSecret) return;
    spotifyClientId = clientId;
    getSpotifyToken(clientId, clientSecret);
});

spotifyCloseBtn.addEventListener('click', () => {
    spotifyConnect.style.display = 'none';
});

spotifyConnect.addEventListener('click', (e) => {
    if (e.target === spotifyConnect) {
        spotifyConnect.style.display = 'none';
    }
});

async function getSpotifyToken(clientId, clientSecret) {
    try {
        const credentials = btoa(clientId + ':' + clientSecret);
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + credentials
            },
            body: 'grant_type=client_credentials'
        });
        if (!res.ok) throw new Error('Auth failed');
        const data = await res.json();
        spotifyToken = data.access_token;
        spotifyConnect.style.display = 'none';
        currentSource = 'spotify';
        spotifyToggle.classList.add('active');
        playlistToggle.classList.remove('active');
        showSpotifyPanel();
    } catch (err) {
        alert('Spotify authentication failed. Check your Client ID and Secret.');
    }
}

function showSpotifyPanel() {
    playlistPanel.classList.add('open');
    panelTitle.textContent = 'Spotify';
    spotifySearch.style.display = 'flex';
    addMusicBtn.style.display = 'none';
    playlistEl.innerHTML = '';
}

playlistToggle.addEventListener('click', () => {
    currentSource = 'local';
    playlistToggle.classList.add('active');
    spotifyToggle.classList.remove('active');
    showLocalPanel();
});

function showLocalPanel() {
    playlistPanel.classList.add('open');
    panelTitle.textContent = 'Local Files';
    spotifySearch.style.display = 'none';
    addMusicBtn.style.display = 'flex';
    renderPlaylist();
}

// --- Local File Handling ---
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        const track = {
            name: file.name.replace(/\.[^/.]+$/, ''),
            artist: '',
            file: file,
            url: URL.createObjectURL(file),
            duration: null,
            artUrl: null,
            source: 'local'
        };
        playlist.push(track);
        readMetadata(track, playlist.length - 1);
    });
    renderPlaylist();
    if (currentIndex === -1 && playlist.length > 0) {
        loadTrack(0);
    }
});

function readMetadata(track, index) {
    if (typeof jsmediatags === 'undefined') return;
    jsmediatags.read(track.file, {
        onSuccess: function(tag) {
            const tags = tag.tags;
            if (tags.title) track.name = tags.title;
            if (tags.artist) track.artist = tags.artist;
            if (tags.album) track.album = tags.album;

            if (tags.picture) {
                const { data, format } = tags.picture;
                const base64 = data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
                track.artUrl = `data:${format};base64,${btoa(base64)}`;
            }

            if (index === currentIndex) {
                updateTrackDisplay(track);
            }
            renderPlaylist();
        },
        onError: function(error) {
            console.log('Metadata read error:', error);
        }
    });
}

function updateTrackDisplay(track) {
    songTitle.textContent = track.name;
    artistName.textContent = track.artist || `Track ${currentIndex + 1} of ${playlist.length}`;
    if (track.artUrl) {
        albumArt.innerHTML = `<img src="${track.artUrl}" alt="Album Art">`;
        albumArt.style.background = 'none';
    } else {
        const hue1 = (currentIndex * 40) % 360;
        const hue2 = (currentIndex * 40 + 60) % 360;
        albumArt.style.background = `linear-gradient(135deg, hsl(${hue1}, 60%, 25%), hsl(${hue2}, 60%, 18%))`;
        albumArt.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    }
}

// --- Spotify Search ---
spotifySearchBtn.addEventListener('click', searchSpotify);
spotifyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchSpotify();
});

async function searchSpotify() {
    const query = spotifyInput.value.trim();
    if (!query || !spotifyToken) return;

    try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, {
            headers: { 'Authorization': 'Bearer ' + spotifyToken }
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        renderSpotifyResults(data.tracks.items);
    } catch (err) {
        console.error('Spotify search error:', err);
    }
}

function renderSpotifyResults(tracks) {
    playlist = [];
    tracks.forEach(track => {
        playlist.push({
            name: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            url: track.preview_url,
            artUrl: track.album.images[0]?.url || null,
            duration: track.duration_ms / 1000,
            source: 'spotify',
            previewUrl: track.preview_url,
            externalUrl: track.external_urls.spotify
        });
    });
    renderPlaylist();
    if (playlist.length > 0) loadTrack(0);
}

// --- Player Controls ---
playlistToggle.addEventListener('click', () => {
    if (!playlistPanel.classList.contains('open')) {
        playlistPanel.classList.add('open');
    }
});

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);

audio.addEventListener('timeupdate', updateProgress);
audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    if (playlist[currentIndex]) {
        playlist[currentIndex].duration = audio.duration;
        renderPlaylist();
    }
});
audio.addEventListener('ended', handleEnd);

progressContainer.addEventListener('click', (e) => {
    if (!audio.src) return;
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pos * audio.duration;
});

let isDragging = false;
progressContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    seekFromEvent(e);
});
document.addEventListener('mousemove', (e) => {
    if (isDragging) seekFromEvent(e);
});
document.addEventListener('mouseup', () => { isDragging = false; });

function seekFromEvent(e) {
    if (!audio.src) return;
    const rect = progressContainer.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pos * audio.duration;
}

function togglePlay() {
    if (playlist.length === 0) return;
    if (currentIndex === -1) loadTrack(0);

    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
    } else {
        audio.play();
        isPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = '';
    }
}

function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const track = playlist[index];

    if (!track.url) {
        songTitle.textContent = track.name;
        artistName.textContent = track.artist || 'No preview available';
        audio.removeAttribute('src');
        progressBar.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = track.duration ? formatTime(track.duration) : '0:00';
        updateTrackDisplay(track);
        renderPlaylist();
        return;
    }

    audio.src = track.url;
    updateTrackDisplay(track);
    progressBar.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    durationEl.textContent = track.duration ? formatTime(track.duration) : '0:00';
    renderPlaylist();
}

function nextTrack() {
    if (playlist.length === 0) return;
    let next;
    if (isShuffle) {
        next = Math.floor(Math.random() * playlist.length);
    } else {
        next = (currentIndex + 1) % playlist.length;
    }
    loadTrack(next);
    if (isPlaying) audio.play();
}

function prevTrack() {
    if (playlist.length === 0) return;
    if (audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    const prev = (currentIndex - 1 + playlist.length) % playlist.length;
    loadTrack(prev);
    if (isPlaying) audio.play();
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    repeatBtn.classList.toggle('active', repeatMode > 0);
    if (repeatMode === 2) {
        repeatBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="15" text-anchor="middle" font-size="7" fill="currentColor" font-weight="bold">1</text></svg>`;
    } else {
        repeatBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`;
    }
}

function handleEnd() {
    if (repeatMode === 2) {
        audio.currentTime = 0;
        audio.play();
    } else if (repeatMode === 1 || currentIndex < playlist.length - 1) {
        nextTrack();
    } else {
        isPlaying = false;
        playIcon.style.display = '';
        pauseIcon.style.display = 'none';
    }
}

function updateProgress() {
    if (!audio.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = percent + '%';
    progressThumb.style.left = percent + '%';
    currentTimeEl.textContent = formatTime(audio.currentTime);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function renderPlaylist() {
    playlistEl.innerHTML = '';
    playlist.forEach((track, i) => {
        const li = document.createElement('li');
        li.className = i === currentIndex ? 'active' : '';

        const thumbHtml = track.artUrl
            ? `<img class="track-thumb" src="${track.artUrl}" alt="">`
            : `<div class="track-thumb" style="display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>`;

        const badge = track.source === 'spotify'
            ? `<span class="track-source-badge spotify">Spotify</span>`
            : `<span class="track-source-badge local">Local</span>`;

        li.innerHTML = `
            ${thumbHtml}
            <div class="track-info">
                <div class="track-name">${track.name}</div>
                <div class="track-artist">${track.artist || ''}</div>
            </div>
            ${badge}
            <span class="track-duration">${track.duration ? formatTime(track.duration) : '--:--'}</span>
        `;
        li.addEventListener('click', () => {
            loadTrack(i);
            audio.play();
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = '';
        });
        playlistEl.appendChild(li);
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    if (e.code === 'ArrowRight') { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); }
    if (e.code === 'ArrowLeft') { audio.currentTime = Math.max(0, audio.currentTime - 5); }
    if (e.code === 'ArrowUp') { volumeSlider.value = Math.min(100, +volumeSlider.value + 5); audio.volume = volumeSlider.value / 100; }
    if (e.code === 'ArrowDown') { volumeSlider.value = Math.max(0, +volumeSlider.value - 5); audio.volume = volumeSlider.value / 100; }
});

// Init
playlistToggle.classList.add('active');

// --- Electron Window Controls ---
let ipcRenderer = null;
try {
    ipcRenderer = require('electron').ipcRenderer;
} catch (e) {
    // Not running in Electron, skip window controls
}

const titleBar = document.getElementById('titleBar');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');

if (ipcRenderer) {
    minimizeBtn.addEventListener('click', () => {
        ipcRenderer.send('minimize-window');
    });

    closeBtn.addEventListener('click', () => {
        ipcRenderer.send('close-window');
    });

    let isMaximized = false;
    titleBar.addEventListener('dblclick', () => {
        ipcRenderer.send('maximize-window');
        isMaximized = !isMaximized;
    });
}
