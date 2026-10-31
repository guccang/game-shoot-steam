// 离线生成原创背景音乐 WAV，浏览器只做异步解码，不在手机上编曲合成。
import { mkdir, writeFile } from 'node:fs/promises';
import { renderMusic } from '../src/platform/audio-music.js';

// 提供纯 PCM 缓冲适配器，使生成脚本无需浏览器或第三方音频依赖。
const context = {
  createBuffer(channels, length, sampleRate) {
    const samples = new Float32Array(length);
    return { sampleRate, duration: length / sampleRate, getChannelData: () => samples };
  },
};
const music = await renderMusic(context, () => false, async () => {});
const samples = music.getChannelData(0);
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(music.sampleRate, 24); wav.writeUInt32LE(music.sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(samples.length * 2, 40);
let peak = 0;
for (let i = 0; i < samples.length; i++) {
  peak = Math.max(peak, Math.abs(samples[i]));
  wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
}
const folder = new URL('../assets/audio/', import.meta.url);
await mkdir(folder, { recursive: true });
await writeFile(new URL('forest-theme.wav', folder), wav);
console.log(`森林主题：${music.duration.toFixed(2)} 秒，峰值 ${peak.toFixed(3)}，${wav.length} 字节`);
