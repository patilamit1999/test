import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TRACKS, parseYouTubeSource, playbackError } from '../src/audio.js';

test('the starting queue contains three distinct Ganpati songs, with the supplied song first', () => {
  assert.equal(DEFAULT_TRACKS[0].id, '_op9dPmACsE');
  assert.equal(DEFAULT_TRACKS.length, 3);
  assert.equal(new Set(DEFAULT_TRACKS.map(track => track.id)).size, 3);
});

test('accepts the supplied short link and strips tracking parameters', () => {
  assert.deepEqual(parseYouTubeSource('https://youtu.be/_op9dPmACsE?si=JbtNimF9iZ-sEGmW'), { videoId: '_op9dPmACsE', playlistId: null });
});

test('accepts watch, embed, shorts, and mobile video URLs', () => {
  for (const url of ['https://www.youtube.com/watch?v=_op9dPmACsE', 'https://youtube.com/embed/_op9dPmACsE', 'https://youtube.com/shorts/_op9dPmACsE', 'https://m.youtube.com/watch?v=_op9dPmACsE']) {
    assert.equal(parseYouTubeSource(url).videoId, '_op9dPmACsE');
  }
});

test('recognizes playlist links and videos inside playlists', () => {
  const playlistId = 'PLabcdefghijklmno';
  assert.deepEqual(parseYouTubeSource(`https://www.youtube.com/playlist?list=${playlistId}`), { videoId: null, playlistId });
  assert.deepEqual(parseYouTubeSource(`https://www.youtube.com/watch?v=_op9dPmACsE&list=${playlistId}`), { videoId: '_op9dPmACsE', playlistId });
});

test('rejects unrelated hosts, unsafe protocols, credentials, and malformed IDs', () => {
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=_op9dPmACsE', 'https://example.com/_op9dPmACsE', 'https://youtube.com@evil.test/watch?v=_op9dPmACsE', 'https://user:pass@youtube.com/watch?v=_op9dPmACsE', 'https://youtube.com/watch?v=short', 'https://youtube.com/playlist?list=abc', 'https://youtube.com', '']) {
    assert.throws(() => parseYouTubeSource(url));
  }
});

test('player errors explain embedding and connectivity limitations', () => {
  assert.match(playbackError(101), /परवानगी नाही/);
  assert.match(playbackError(150), /परवानगी नाही/);
  assert.match(playbackError(100), /खाजगी|काढून टाकले/);
  assert.match(playbackError(153), /ब्राउझरचा संदर्भ/);
});
