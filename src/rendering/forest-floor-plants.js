import {oval as ellipse} from './primitives.js';
// 蕨叶、蘑菇和花簇沿同一地脚生长，地面细节与林下成组摆件共用正式画笔。
export function plant(c, x, y, kind, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  if (kind === 0) {
    for (let i = -2; i <= 2; i++) {
      c.strokeStyle = '#67834d';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(i * 6, -9, i * 5, -22 + Math.abs(i) * 4);
      c.stroke();
      for (let j = 1; j < 4; j++) ellipse(c, i * j * 1.4, -j * 5 + Math.abs(i), 4, 1.7, j % 2 ? '#7f9e56' : '#a7b969');
    }
  } else if (kind === 1) {
    for (const dx of [-5, 4]) {
      c.fillStyle = '#e4c89d';
      c.fillRect(dx, -9, 3, 10);
      c.fillStyle = '#bd7657';
      c.beginPath();
      c.ellipse(dx + 1, -10, 7, 5, 0, Math.PI, Math.PI * 2);
      c.fill();
      ellipse(c, dx - 1, -12, 1.5, 1, '#f7dfb4');
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const px = i * 7 - 7,
        py = -(i % 2) * 6 - 6;
      ellipse(c, px, py + 4, 5, 2, '#6e9054');
      for (let p = 0; p < 5; p++)
        ellipse(
          c,
          px + Math.cos(p * 1.26) * 3,
          py + Math.sin(p * 1.26) * 3,
          2.3,
          2.3,
          kind === 3 ? '#b8a3c6' : '#fff1d3',
        );
      ellipse(c, px, py, 1.8, 1.8, '#dcad57');
    }
  }
  c.restore();
}
