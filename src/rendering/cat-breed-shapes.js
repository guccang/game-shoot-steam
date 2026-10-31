import { i18nText } from "../i18n/index.js";
// 品种头部接在每张真实视频帧的颈线上；源帧眨眼、脚步、尾巴和躯干动作完整保留。
import { CAT_APPEARANCES } from '../config/cat-appearance.js';
const OUTLINE = '#615743';

// 用宽面部色带和下方围巾识别头部位置，不按时间猜测偏移，起停仍沿原视频连续运动。
export function catHeadLandmarks(pixels, size) {
  let first = -1, last = -1, left = size, right = 0;
  for (let y = Math.floor(size * 0.14); y < size * 0.7; y++) {
    let count = 0, l = size, r = 0;
    for (let x = Math.floor(size * 0.24); x < size * 0.83; x++) {
      const i = (y * size + x) * 4;
      if (pixels[i + 3] > 180 && pixels[i] > 175 && pixels[i + 1] > 155 && pixels[i + 2] > 95) {
        count++; l = Math.min(l, x); r = x;
      }
    }
    if (count >= size * 0.28) {
      if (first < 0) first = y;
      last = y; left = Math.min(left, l); right = Math.max(right, r);
    } else if (first >= 0 && y - last > 3) break;
  }
  if (first < 0) throw Error(i18nText("rendering.cat-breed-shapes.14dd2b412e"));
  const x = (left + right) / 2;
  let neck = last + 7;
  for (let y = last; y <= last + 13 && y < size; y++) {
    let green = 0;
    for (let px = Math.floor(x - 28); px <= x + 28; px++) {
      const i = (y * size + px) * 4;
      if (pixels[i + 3] > 180 && pixels[i] < 170 && pixels[i + 1] > pixels[i] + 8 && pixels[i + 1] > pixels[i + 2] + 8) green++;
    }
    if (green > 7) { neck = Math.min(neck, y); break; }
  }
  return { x, y: neck - 28, neck, first, last };
}

// 有限曲线定义颧部与下颌；长毛仅在外缘形成少量毛束，保持小尺寸清晰。
function facePath(c, p) {
  const w = p.width, h = p.cheek;
  c.beginPath(); c.moveTo(-w * .72, -22);
  c.bezierCurveTo(-w * .35, -32, w * .35, -32, w * .72, -22);
  if (p.face === 'wedge') {
    c.bezierCurveTo(w + 5, -12, w * .62, 12, 13, h);
    c.quadraticCurveTo(0, h + 5, -13, h);
    c.bezierCurveTo(-w * .62, 12, -w - 5, -12, -w * .72, -22);
  } else if (p.face === 'square') {
    c.bezierCurveTo(w, -20, w + 3, 2, w - 2, 15);
    c.quadraticCurveTo(w - 8, h, 20, h); c.lineTo(-20, h);
    c.quadraticCurveTo(-w + 8, h, -w + 2, 15);
    c.bezierCurveTo(-w - 3, 2, -w, -20, -w * .72, -22);
  } else if (p.face === 'fluffy') {
    c.quadraticCurveTo(w, -15, w, -2);
    c.lineTo(w + 7, 5); c.lineTo(w, 8); c.lineTo(w + 5, 16); c.lineTo(w - 4, 17);
    c.lineTo(w - 3, 25); c.lineTo(w - 14, 23);
    c.quadraticCurveTo(0, h + 13, -w + 14, 23);
    c.lineTo(-w + 3, 25); c.lineTo(-w + 4, 17); c.lineTo(-w - 5, 16); c.lineTo(-w, 8); c.lineTo(-w - 7, 5); c.lineTo(-w, -2);
    c.quadraticCurveTo(-w, -15, -w * .72, -22);
  } else {
    const round = p.face === 'round';
    c.bezierCurveTo(w + (round ? 12 : 3), -19, w + 6, 21, w * .55, h);
    c.quadraticCurveTo(0, h + 9, -w * .55, h);
    c.bezierCurveTo(-w - 6, 21, -w - (round ? 12 : 3), -19, -w * .72, -22);
  }
  c.closePath();
}

// 耳尖高度、底宽与圆角分别设置；耳内单独绘制，避免变成同一种三角贴片。
function drawEar(c, p, side) {
  c.save(); c.translate(side * p.earSpread, -20); c.scale(side, 1);
  const h = p.earHeight, wide = p.ear === 'wide', w = wide ? 22 : 15;
  c.beginPath(); c.moveTo(-w, 6);
  if (p.ear === 'round') {
    c.bezierCurveTo(-w - 2, -h, w - 1, -h - 3, w, -h * .4);
    c.quadraticCurveTo(w + 2, -1, w - 2, 9);
  } else {
    c.quadraticCurveTo(-3, -h * .7, wide ? w + 7 : w - 2, -h);
    c.quadraticCurveTo(w + 3, -h + 2, w, 8);
  }
  c.closePath(); c.fillStyle = p.earFur; c.strokeStyle = OUTLINE; c.lineWidth = 3;
  c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-6, 2); c.quadraticCurveTo(2, -h * .45, w - 4, -h + 8);
  c.quadraticCurveTo(w - 2, -6, w - 5, 4); c.closePath(); c.fillStyle = p.inner; c.fill();
  if (p.ear === 'tuft') {
    c.beginPath(); c.moveTo(3, -h + 9); c.lineTo(w - 4, -h + 1); c.lineTo(w - 4, -h + 10);
    c.strokeStyle = '#f6eee1'; c.lineWidth = 2.5; c.stroke();
  }
  c.restore();
}

// 眉纹、双色面罩与短毛亮面只画两级平涂，不改变原视频眼口表情。
function drawMarkings(c, p) {
  c.save(); facePath(c, p); c.clip();
  c.fillStyle = p.shade; c.beginPath(); c.ellipse(0, 30, p.width + 4, 10, 0, 0, Math.PI * 2); c.fill();
  if (p.markings === 'point') {
    c.fillStyle = '#8b796f'; c.beginPath(); c.ellipse(0, 8, 29, 29, 0, 0, Math.PI * 2); c.fill();
  } else if (p.markings === 'bicolor') {
    c.fillStyle = '#afa29b';
    for (const side of [-1, 1]) {
      c.beginPath(); c.moveTo(side * 45, -32); c.lineTo(side * 5, -30); c.quadraticCurveTo(side * 10, -9, side * 38, 19); c.lineTo(side * 55, 5); c.closePath(); c.fill();
    }
  } else if (p.markings === 'tabby' || p.markings === 'orange') {
    c.strokeStyle = p.markings === 'tabby' ? '#728a8c' : '#ce9e5e'; c.lineWidth = 3.5; c.lineCap = 'round';
    for (const x of [-12, 0, 12]) { c.beginPath(); c.moveTo(x, -27); c.lineTo(x * .78, -17); c.stroke(); }
    for (const side of [-1, 1]) for (const y of [0, 10]) {
      c.beginPath(); c.moveTo(side * (p.width - 1), y - 3); c.lineTo(side * (p.width - 11), y); c.stroke();
    }
  } else if (p.markings === 'silver') {
    c.fillStyle = '#c1d0c9'; c.beginPath(); c.ellipse(0, -27, 31, 10, 0, 0, Math.PI * 2); c.fill();
  } else if (p.markings === 'gloss') {
    c.fillStyle = '#718187'; c.beginPath(); c.ellipse(-13, -19, 12, 4, -.3, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

// 颈毛画在源身体两侧，围巾、胸口与脚底仍显示当前真实帧。
function drawRuff(c, head, p) {
  c.save(); c.translate(head.x, head.neck + 4);
  c.beginPath(); c.moveTo(-29, -10); c.lineTo(-38, 4); c.lineTo(-31, 3); c.lineTo(-36, 14); c.lineTo(-27, 11);
  c.quadraticCurveTo(0, 30, 27, 11); c.lineTo(36, 14); c.lineTo(31, 3); c.lineTo(38, 4); c.lineTo(29, -10);
  c.closePath(); c.fillStyle = p.fur; c.strokeStyle = OUTLINE; c.lineWidth = 2.5; c.fill(); c.stroke(); c.restore();
}

// 替换局部头部轮廓，并从同一源帧保留眨眼和口型像素；没有静帧替代整个动作。
export function shapeCatFrame(c, source, colored, size, id) {
  const p = CAT_APPEARANCES[id];
  if (!p) throw Error(i18nText("rendering.cat-breed-shapes.ba9ed3264b"));
  const head = catHeadLandmarks(source, size);
  c.clearRect(0, 0, size, size);
  if (p.ruff) drawRuff(c, head, p);
  c.drawImage(colored, 0, 0);
  // 只擦掉旧头部；尾巴上扬超过颈线时仍保留，薄荷的旧帽子使用较宽清理区。
  const eraseWidth = id === 'mint' ? 55 : 46;
  c.clearRect(head.x - eraseWidth, 0, eraseWidth * 2, head.neck);
  c.save(); c.translate(head.x, head.y);
  drawEar(c, p, -1); drawEar(c, p, 1);
  facePath(c, p); c.fillStyle = p.fur; c.strokeStyle = OUTLINE; c.lineWidth = 3; c.fill(); c.stroke();
  drawMarkings(c, p);
  // 原片腮红用柔和圆斑重绘，保持眼口提取区域不包含脸部轮廓。
  c.globalAlpha = p.markings === 'gloss' ? .15 : .35; c.fillStyle = '#d8a38b';
  for (const side of [-1, 1]) { c.beginPath(); c.ellipse(side * 25 * p.features, 9, 5, 2.7, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
  // 只重绘眼口掩膜，逐像素保持源帧的开眼、眨眼与微笑，不重新合成动作。
  const features = c.createImageData(size, size), out = features.data;
  for (let y = Math.floor(head.y - 8); y < head.y + 20; y++) for (let x = Math.floor(head.x - 23); x <= head.x + 23; x++) {
    const i = (y * size + x) * 4, r = source[i], g = source[i + 1], b = source[i + 2];
    if (source[i + 3] < 100 || !(r < 145 && g < 125 && b < 110 && r > g)) continue;
    const j = i;
    const color = y < head.y + 3 ? p.eyes : p.mouth;
    out[j] = parseInt(color.slice(1, 3), 16); out[j + 1] = parseInt(color.slice(3, 5), 16); out[j + 2] = parseInt(color.slice(5, 7), 16); out[j + 3] = source[i + 3];
  }
  // 临时画布使用调用方的源帧工作区，缓存只保留最终图，避免每个品种驻留多份图像。
  const f = colored.getContext('2d'); f.clearRect(0, 0, size, size); f.putImageData(features, 0, 0);
  c.drawImage(colored, head.x - 24, head.y - 8, 48, 28, head.x - 24 * p.features, head.y - 8, 48 * p.features, 28);
  return head;
}
