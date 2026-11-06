// 在水面局部绘制顺着风向行进的两道弧纹，由调用方负责岸线裁切。
export function drawWindRipple(c, x, y, time, strength, seed) {
  if (strength < .02) return;
  const phase = (time * .58 + seed * .37) % 1;
  const left = x - phase * 26;
  c.save();
  c.globalAlpha *= strength * Math.sin(Math.PI * phase) * .75;
  c.strokeStyle = '#d6eee2';
  c.lineCap = 'round';
  c.lineWidth = 1.7;
  c.beginPath();
  for (let i = 0; i < 2; i++) {
    const width = (10 + phase * 9) * (1 - i * .38);
    const py = y + i * 4;
    c.moveTo(left - width, py);
    c.quadraticCurveTo(left, py + 3, left + width, py - 1);
  }
  c.stroke();
  c.restore();
}
