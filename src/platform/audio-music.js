import { i18nText } from "../i18n/index.js";
// 原创森林主题：十六小节循环，木琴主旋律、拨弦分解和弦与柔和低音。
const RATE = 22050, BEAT = 60 / 88, BARS = 16;
const CHORDS = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const MELODY = [
  [72, 76, 79, 76, 74, 72, 67, 69], [72, 69, 76, 74, 72, 69, 64, 67],
  [69, 72, 77, 76, 72, 69, 65, 69], [71, 74, 79, 77, 74, 71, 67, 74],
];

// 运行时只异步解码预生成音乐，合成留在构建脚本，避免手机首次开启时卡顿。
export async function loadMusic(context, cancelled = () => false) {
  const response = await fetch(new URL('../../assets/audio/forest-theme.wav', import.meta.url));
  if (!response.ok) throw new Error(i18nText("platform.audio-music.45284cfa34"));
  const data = await response.arrayBuffer();
  if (cancelled()) return null;
  return context.decodeAudioData(data);
}

// 循环写入音符尾音，最后一小节跨接第一小节时不截断、不产生爆音。
function addNote(samples, start, midi, duration, volume, instrument) {
  const frequency = 440 * 2 ** ((midi - 69) / 12), first = Math.floor(start * RATE);
  const length = Math.ceil(duration * RATE);
  for (let i = 0; i < length; i++) {
    const t = i / RATE, p = t / duration, phase = 2 * Math.PI * frequency * t;
    const envelope = Math.min(1, t / 0.012) * Math.exp(-p * (instrument === 'bass' ? 3 : 5)) *
      Math.min(1, (duration - t) / 0.06);
    const tone = instrument === 'bell'
      ? Math.sin(phase) + 0.22 * Math.sin(phase * 3) * Math.exp(-t * 10)
      : Math.sin(phase) + Math.sin(phase * 2) * (instrument === 'bass' ? 0.12 : 0.3);
    samples[(first + i) % samples.length] += tone * envelope * volume;
  }
}

// 每小节让出主线程，首次启用时也不长时间阻塞手机；卸载后立刻取消后续合成。
export async function renderMusic(context, cancelled = () => false, yieldTask = () =>
  new Promise(resolve => setTimeout(resolve, 0))) {
  const buffer = context.createBuffer(1, Math.round(BARS * 4 * BEAT * RATE), RATE);
  const samples = buffer.getChannelData(0);
  for (let bar = 0; bar < BARS; bar++) {
    if (cancelled()) return null;
    const chord = CHORDS[bar % 4], phrase = MELODY[bar % 4], start = bar * 4 * BEAT;
    for (let eighth = 0; eighth < 8; eighth++) {
      const time = start + eighth * BEAT / 2;
      addNote(samples, time, chord[[0, 1, 2, 1][eighth % 4]] + 12, 0.65, 0.045, 'pluck');
      if (!(bar % 4 === 3 && eighth === 7))
        addNote(samples, time, phrase[(eighth + (bar >= 8 ? 2 : 0)) % 8], 0.8, 0.095, 'bell');
    }
    addNote(samples, start, chord[0] - 12, BEAT * 1.8, 0.095, 'bass');
    addNote(samples, start + BEAT * 2, chord[2] - 12, BEAT * 1.8, 0.07, 'bass');
    await yieldTask();
  }
  return buffer;
}
