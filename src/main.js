import './style.css';
import { createScene } from './scene.js';
import { createFestivalAudio } from './audio.js';
import { createMultiplayer } from './multiplayer.js';
import { cleanName, joystickVector } from './world.js';

const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('mr-IN');
const audio = createFestivalAudio({ onChange: updateMusic, isVisible: () => true });
const state = { entered: false, name: '', gender: 'male', station: null, flowers: false, prasad: false };
let world, toastTimer;
const mp = createMultiplayer({
  onJoin: (id, info) => world?.addRemoteVisitor(id, info),
  onLeave: id => world?.removeRemoteVisitor(id),
  onUpdate: (id, info) => world?.updateRemoteVisitor(id, info),
  onVisitorList: visitors => visitors.forEach(v => world?.addRemoteVisitor(v.id, v)),
  onFlowers: () => {},
  onPrasad: () => {},
  onError: msg => toast(msg),
});

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}

function updateInteraction(station) {
  state.station = station;
  $('location-label').textContent = station === 'darshan' ? 'बाप्पांच्या चरणी' : station === 'prasad' ? 'प्रसाद कक्ष' : 'मंडपात फेरफटका';
}

function showDialog(title, content) {
  world?.pause();
  $('dialog-title').textContent = title;
  $('dialog-content').innerHTML = content;
  if (!$('info-dialog').open) $('info-dialog').showModal();
}

$('visitor-name').addEventListener('invalid', () => $('visitor-name').setCustomValidity('दर्शन सुरू करण्यासाठी कृपया आपले नाव लिहा.'));
$('entry-form').addEventListener('submit', event => {
  event.preventDefault();
  const name = cleanName($('visitor-name').value);
  if (!name) {
    $('visitor-name').setCustomValidity('दर्शन सुरू करण्यासाठी कृपया आपले नाव लिहा.');
    $('visitor-name').reportValidity();
    return;
  }
  if (!world) return;
  state.name = name;
  state.gender = new FormData(event.currentTarget).get('gender');
  state.entered = true;
  $('visitor-greeting').textContent = `नमस्कार, ${name}`;
  document.querySelector('.experience').classList.add('playing');
  $('game-hud').hidden = false;
  world.enter(name, state.gender);
  $('location-label').textContent = 'मंडपाचे प्रवेशद्वार';
  window.scrollTo({ top: 0, behavior: 'instant' });
  audio.play().catch(() => {});
  mp.connect();
  mp.sendUpdate({ name, gender: state.gender, x: 0, z: 10.5, angle: 0 });
  toast(window.matchMedia('(any-pointer: coarse), (max-width: 760px)').matches
    ? 'चालण्यासाठी डावीकडील जॉयस्टिक ओढा. थांबण्यासाठी सोडा. आजूबाजूला पाहण्यासाठी दृश्य डावीकडे-उजवीकडे आणि वर-खाली ओढा.'
    : 'स्वागत आहे! चालण्यासाठी W, A, S, D किंवा बाणांची बटणे वापरा. आजूबाजूला पाहण्यासाठी दृश्य डावीकडे-उजवीकडे आणि वर-खाली ओढा.');
});
$('visitor-name').addEventListener('input', () => $('visitor-name').setCustomValidity(''));
$('leave-button').addEventListener('click', () => {
  state.entered = false;
  world.leave();
  audio.pause();
  mp.disconnect();
  document.querySelector('.experience').classList.remove('playing');
  $('game-hud').hidden = true;
  $('toast').hidden = true;
  $('visitor-name').focus({ preventScroll: true });
});
function updateMusic(next) {
  const track = next.tracks[next.index];
  $('music-title').textContent = track?.title || 'आपली यूट्यूब गाण्यांची यादी';
  $('music-artist').textContent = track?.artist || 'यूट्यूब';
  $('music-count').textContent = `${number(next.index + 1)} / ${number(next.tracks.length)}`;
  $('music-status').textContent = next.error || next.status;
  $('music-status').classList.toggle('music-error', Boolean(next.error));
  $('music-play').textContent = next.loading ? 'जोडत आहोत…' : next.playing ? 'थांबवा' : 'ऐका';
  $('music-play').disabled = next.loading;
  $('music-previous').disabled = !next.ready || next.index <= 0;
  $('music-next').disabled = !next.ready || next.index >= next.tracks.length - 1;
  $('music-shuffle').disabled = !next.ready || next.tracks.length < 2;
  $('music-shuffle').setAttribute('aria-pressed', String(next.shuffle));
  $('music-volume').value = next.volume;
  $('music-volume-value').textContent = `${number(next.volume)}%`;
  $('sound-label').textContent = next.playing ? 'गाणे सुरू आहे' : 'गणपतीची गाणी';
  $('sound-toggle').classList.toggle('music-playing', next.playing);
  const external = new URL('https://www.youtube.com/watch');
  external.searchParams.set('v', track?.id || '_op9dPmACsE');
  if (next.playlistId) external.searchParams.set('list', next.playlistId);
  $('music-external').href = external.href;
  const queue = next.tracks.map((song, index) => {
    const row = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${number(index + 1).padStart(2, '०')}  ${song.title}`;
    button.setAttribute('aria-current', String(index === next.index));
    button.disabled = !next.ready;
    button.addEventListener('click', () => audio.select(index));
    row.append(button);
    return row;
  });
  $('music-queue').replaceChildren(...queue);
}
function closeMusic() {
  $('music-panel').hidden = true;
  $('sound-toggle').setAttribute('aria-expanded', 'false');
  $('sound-toggle').focus({ preventScroll: true });
}
$('sound-toggle').addEventListener('click', () => {
  if (!$('music-panel').hidden) { closeMusic(); return; }
  $('music-panel').hidden = false;
  $('sound-toggle').setAttribute('aria-expanded', 'true');
  world?.pause();
  $('music-play').focus({ preventScroll: true });
});
$('music-close').addEventListener('click', closeMusic);
$('music-play').addEventListener('click', () => audio.toggle());
$('music-next').addEventListener('click', () => audio.next());
$('music-previous').addEventListener('click', () => audio.previous());
$('music-shuffle').addEventListener('click', () => audio.shuffle());
$('music-volume').addEventListener('input', event => audio.setVolume(event.target.value));
$('music-reset').addEventListener('click', () => { audio.reset(); $('music-add-status').textContent = 'मूळ तीन गाणी पुन्हा यादीत जोडली आहेत.'; });
$('music-url').addEventListener('invalid', () => $('music-url').setCustomValidity('कृपया यूट्यूबच्या गाण्याचा किंवा यादीचा योग्य दुवा द्या.'));
$('music-url').addEventListener('input', () => $('music-url').setCustomValidity(''));
$('music-add-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    $('music-add-status').textContent = audio.add($('music-url').value);
    $('music-url').value = '';
  } catch (error) { $('music-add-status').textContent = error.message; }
});
$('music-panel').addEventListener('keydown', event => {
  event.stopPropagation();
  if (event.key === 'Escape') closeMusic();
});
$('music-panel').addEventListener('focusin', () => world?.pause());
updateMusic(audio.getState());
$('view-toggle').addEventListener('click', () => world?.toggleView());
$('fullscreen-toggle').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.querySelector('.experience').requestFullscreen) await document.querySelector('.experience').requestFullscreen();
    else toast('या ब्राउझरमध्ये पूर्ण पडद्याची सुविधा उपलब्ध नाही.');
  } catch { toast('सध्या पूर्ण पडद्यावर दाखवता येत नाही.'); }
});
$('help-toggle').addEventListener('click', () => showDialog('चला, मंडपात फेरफटका मारूया', '<p>आपले नाव लिहा, पात्र निवडा आणि उत्सवात सहभागी व्हा.</p><ul><li><strong>चालण्यासाठी:</strong> W, A, S, D किंवा बाणांची बटणे वापरा. मोबाईलवर डावीकडील जॉयस्टिक इच्छित दिशेला ओढा. थोडे ओढल्यास हळू, जास्त ओढल्यास वेगाने चालता येते. सोडल्यावर पात्र थांबते. चालतानाही दुसऱ्या बोटाने दृश्य फिरवता येते.</li><li><strong>आजूबाजूला पाहण्यासाठी:</strong> त्रिमितीय दृश्य डावीकडे-उजवीकडे आणि वर-खाली ओढा.</li><li><strong>विस्तृत दृश्य:</strong> दृश्य बदलण्याचे बटण वापरा.</li></ul><p class="small-note">मंडपात प्रवेश केल्यावर गाणी आपोआप सुरू होतात. ‘गणपतीची गाणी’ उघडून गाण्यांची यादी बदलता येते. संगीत खिडकी बंद केल्यावरही गाणी चालू राहतात.</p>'));
$('about-link').addEventListener('click', () => showDialog('अंतर मिटवणारा आपला मंडप', '<p>अंकित, अमित आणि पाटील परिवाराकडून गणेश चतुर्थीच्या हार्दिक शुभेच्छा! सर्वांनी एकत्र उत्सव अनुभवावा, यासाठी हे छोटेसे आभासी देवस्थान.</p><p>तरंगता खडकाळ पर्वत, वाहते पाणी, हिरवीगार झाडे आणि उजळलेले खांब ही सजावट आपण दिलेल्या छायाचित्रातून प्रेरित आहे. मध्यभागी गणपती बाप्पांची त्रिमितीय मूर्ती, प्रवेशद्वारी ढोल-ताशांचे पथक आणि जवळच प्रसाद कक्ष आहे.</p><p class="small-note">हा एका व्यक्तीसाठीचा आभासी अनुभव आहे. आपले नाव फक्त या पानाच्या तात्पुरत्या स्मृतीत राहते; ते सर्व्हरवर पाठवले जात नाही. पात्रे आणि सजावट ही कलात्मक मांडणी आहे. इच्छेनुसार गाणी यूट्यूबवरून ऐकता येतात.</p>'));
$('home-link').addEventListener('click', () => {
  if (state.entered) $('leave-button').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('close-dialog').addEventListener('click', () => $('info-dialog').close());
$('info-dialog').addEventListener('click', event => {
  if (event.target !== $('info-dialog')) return;
  const rect = event.target.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
});
const joystick = $('joystick');
let joystickPointer = null, joystickCenter = { x: 0, y: 0 }, joystickRadius = 1;
function resetJoystick() {
  const pointer = joystickPointer;
  joystickPointer = null;
  joystick.classList.remove('is-active');
  joystick.style.setProperty('--stick-x', '0px');
  joystick.style.setProperty('--stick-y', '0px');
  world?.setJoystickInput(0, 0);
  if (pointer !== null && joystick.hasPointerCapture(pointer)) joystick.releasePointerCapture(pointer);
}
function moveJoystick(event) {
  if (event.pointerId !== joystickPointer) return;
  event.preventDefault();
  const input = joystickVector(event.clientX - joystickCenter.x, event.clientY - joystickCenter.y, joystickRadius);
  joystick.style.setProperty('--stick-x', `${input.x * joystickRadius}px`);
  joystick.style.setProperty('--stick-y', `${input.z * joystickRadius}px`);
  world?.setJoystickInput(input.x, input.z);
}
joystick.addEventListener('pointerdown', event => {
  if (event.button !== 0 || joystickPointer !== null || !state.entered || $('info-dialog').open) return;
  event.preventDefault();
  const bounds = joystick.getBoundingClientRect();
  joystickCenter = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  joystickRadius = Math.max(1, (bounds.width - $('joystick-knob').offsetWidth) / 2 - 4);
  joystickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  joystick.classList.add('is-active');
  moveJoystick(event);
});
joystick.addEventListener('pointermove', moveJoystick);
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  joystick.addEventListener(type, event => { if (event.pointerId === joystickPointer) resetJoystick(); });
}
joystick.addEventListener('contextmenu', event => event.preventDefault());
joystick.addEventListener('keydown', event => { if (event.key === 'Escape') world?.pause(); });
joystick.addEventListener('blur', () => world?.pause());
const joystickResize = new ResizeObserver(resetJoystick);
joystickResize.observe(joystick);
window.addEventListener('resize', resetJoystick);

try {
  world = createScene($('world'), updateInteraction, resetJoystick);
  if (import.meta.env?.DEV) window.__world = world;
  $('enter-button').disabled = false;
  $('enter-label').textContent = 'मंडपात प्रवेश करा';
  $('loading-status').hidden = true;
  setInterval(() => {
    if (!state.entered || !mp.connected) return;
    const pos = world.getPosition();
    mp.sendUpdate({ x: pos.x, z: pos.z, angle: world.getAngle() });
  }, 100);
  $('world').addEventListener('webglcontextlost', event => {
    event.preventDefault();
    world.pause();
    $('toast').classList.add('error');
    toast('त्रिमितीय दृश्यात व्यत्यय आला आहे. पुन्हा दर्शन घेण्यासाठी हे पान नव्याने उघडा.');
    clearTimeout(toastTimer);
  });
} catch (error) {
  console.error('त्रिमितीय मंडप सुरू करता आला नाही:', error);
  $('loading-status').hidden = true;
  $('enter-label').textContent = 'या ब्राउझरमध्ये त्रिमितीय दृश्य उपलब्ध नाही';
  $('toast').classList.add('error');
  toast('या अनुभवासाठी वेबजीएल आवश्यक आहे. हार्डवेअर प्रवेग सुरू करा किंवा क्रोम, सफारी अथवा फायरफॉक्सची नवीन आवृत्ती वापरा.');
  clearTimeout(toastTimer);
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  resetJoystick();
  joystickResize.disconnect();
  window.removeEventListener('resize', resetJoystick);
  world?.dispose();
  audio.dispose();
  mp.disconnect();
  clearTimeout(toastTimer);
});
