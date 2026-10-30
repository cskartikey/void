// Nothing typed here is stored or sent anywhere. It lives in the DOM for
// the length of the animation and is then removed.

const field = document.querySelector('.field');
const flights = document.querySelector('.flights');
const kick = document.querySelector('.kick');
const hots = document.querySelectorAll('.hot');
const core = document.querySelector('.core');
const soundBtn = document.querySelector('.sound');

let sent = 0;
let soundOn = true;
let ctx = null;

field.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    send();
  }
});

soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
  field.focus();
});

function send() {
  const text = field.value.trim();
  if (!text) return;
  field.value = '';
  sent += 1;

  whoosh();

  const fly = document.createElement('p');
  fly.className = 'box fly';
  fly.textContent = text;
  fly.addEventListener('animationend', () => fly.remove());
  flights.appendChild(fly);

  // Alternate between two identical keyframe names so a new send restarts
  // the animation even while the previous one is still running.
  const ab = sent % 2 ? 'A' : 'B';
  kick.className = 'kick k' + ab;
  hots.forEach((el) => {
    el.className = el.classList.contains('bloom') ? 'hot bloom g' + ab : 'hot g' + ab;
  });

  setTimeout(() => core.classList.add('gulp'), 1500);
  setTimeout(() => core.classList.remove('gulp'), 1850);
}

function whoosh() {
  if (!soundOn) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = ctx || new AC();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime + 0.02;
  const out = ctx.createGain();
  out.gain.value = 0.55;
  out.connect(ctx.destination);

  // air: band-passed noise that rises, then gets pulled down
  const len = Math.floor(ctx.sampleRate * 1.9);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(350, t);
  bp.frequency.exponentialRampToValueAtTime(2400, t + 0.9);
  bp.frequency.exponentialRampToValueAtTime(140, t + 1.75);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.5, t + 0.85);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

  // swirl: pan the air left and right, faster as it spirals in
  let last = ng;
  if (ctx.createStereoPanner) {
    const pan = ctx.createStereoPanner();
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.setValueAtTime(0.8, t);
    lfo.frequency.exponentialRampToValueAtTime(9, t + 1.6);
    depth.gain.setValueAtTime(0.75, t);
    depth.gain.linearRampToValueAtTime(0.1, t + 1.7);
    lfo.connect(depth);
    depth.connect(pan.pan);
    lfo.start(t);
    lfo.stop(t + 1.9);
    ng.connect(pan);
    last = pan;
  }
  noise.connect(bp);
  bp.connect(ng);
  last.connect(out);
  noise.start(t);
  noise.stop(t + 1.9);

  // pitch falling into the hole
  const tone = ctx.createOscillator();
  const tg = ctx.createGain();
  tone.type = 'sine';
  tone.frequency.setValueAtTime(520, t);
  tone.frequency.exponentialRampToValueAtTime(60, t + 1.6);
  tg.gain.setValueAtTime(0.0001, t);
  tg.gain.exponentialRampToValueAtTime(0.06, t + 0.6);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 1.65);
  tone.connect(tg);
  tg.connect(out);
  tone.start(t);
  tone.stop(t + 1.7);

  // the swallow: a low thump as it hits the centre
  const sub = ctx.createOscillator();
  const sg = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(95, t + 1.45);
  sub.frequency.exponentialRampToValueAtTime(30, t + 2.5);
  sg.gain.setValueAtTime(0.0001, t + 1.45);
  sg.gain.exponentialRampToValueAtTime(0.7, t + 1.52);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
  sub.connect(sg);
  sg.connect(out);
  sub.start(t + 1.45);
  sub.stop(t + 2.7);
}
