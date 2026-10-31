// 导出与游戏同源的枪械试听，跳过已禁用音色；不修改游戏资产。
import { mkdir, writeFile } from 'node:fs/promises';
import { renderSound, renderEngine } from '../src/platform/audio-sounds.js';
import {MUTED_WEAPON_SOUNDS} from '../src/platform/audio-weapons.js';
const RATE = 22050, folder = new URL('../output/playwright/weapon-audio/', import.meta.url);
const context = {
  // 纯 PCM 适配器让 Node 离线生成与浏览器相同的采样。
  createBuffer(channels, length, sampleRate) {
    const samples = new Float32Array(length);
    return { sampleRate, duration: length / sampleRate, getChannelData: () => samples };
  },
};

// 以游戏默认音效与主音量导出，不为试听额外提升响度。
async function writeWave(name, samples) {
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(RATE, 24); wav.writeUInt32LE(RATE * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++)
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  await writeFile(new URL(`${name}.wav`, folder), wav);
}
await mkdir(folder, { recursive: true });
const clips = [];
// 机械音色模式复用同一导出器，试听文件仅存 output，不进入运行资源。
const machines=process.argv.includes('--machines');
const kinds=machines?['vehicle-machinegun','tank-125','vehicle-vulcan','hover-tide','mechanical-core','mechanical-spider','mechanical-deploy','spider-hatch',...Array.from({length:4},(_,i)=>`engine-${i}`)]:['pistol','chainsaw','flame','sniper','pulse'];
const exportedKinds=kinds.filter(kind=>!MUTED_WEAPON_SOUNDS.has(kind));
for (const kind of exportedKinds) {
  const engine=kind.startsWith('engine-');
  const source = (engine?renderEngine(context,Number(kind.at(-1))):renderSound(context, kind)).getChannelData(0);
  const continuous = engine||['chainsaw', 'flame'].includes(kind);
  const interval={'pistol':.5,'vehicle-machinegun':.16,'vehicle-vulcan':.065,'hover-tide':.65}[kind];
  const duration = continuous ? 3 : interval ? 1.5 : source.length / RATE;
  const clip = new Float32Array(Math.ceil(duration * RATE));
  let position = 0;
  for (let i = 0; i < clip.length; i++) {
    const t = i / RATE;
    // 电锯前段空转、后段带载，沿用服务中的转速和音量目标。
    const load = kind === 'chainsaw' && t > 1;
    const rate = engine?(t<1?.85:1.2):kind === 'chainsaw' ? (load ? 0.86 : 1.08) : 1;
    const gain = engine?(t<1?.38:.6):kind === 'chainsaw' ? (load ? 0.9 : 0.62) : kind === 'flame' ? 0.85 : 1;
    const index = Math.floor(position);
    let sample = continuous ? source[index % source.length] : source[index] || 0;
    if(interval){
      sample=0;
      for(let shot=0;shot<=t;shot+=interval){
        sample+=source[Math.round((t-shot)*RATE)]||0;
        if(kind==='hover-tide')sample+=source[Math.round((t-shot-.12)*RATE)]||0;
      }
    }
    const envelope = continuous ? Math.min(1, t / 0.08, (duration - t) / 0.12) : 1;
    clip[i] = sample * gain * envelope * 0.8 * 0.65;
    position += rate;
  }
  await writeWave(kind, clip);
  clips.push(clip, new Float32Array(RATE * 0.65));
}
const montage = new Float32Array(clips.reduce((sum, clip) => sum + clip.length, 0));
let offset = 0;
for (const clip of clips) { montage.set(clip, offset); offset += clip.length; }
await writeWave(machines?'machine-audition':'weapon-audition', montage);
console.log(`已生成 ${exportedKinds.length} 种音色试听及 ${(montage.length / RATE).toFixed(1)} 秒合集。`);
