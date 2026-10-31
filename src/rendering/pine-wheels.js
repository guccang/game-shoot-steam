// 共用美术绘制主体：颜色、线宽与局部细节来自当前风格配置。
import { style } from '../art-styles/config.js';
import { box, oval, poly, outline } from './primitives.js';

// 松果轮式战车：四轮、底盘和前装甲分层共享，轮毂与胎纹独立运动。

// 在固定椭圆胎面上投影滚动胎纹，外侧轮毂保留同一车轴和接地点。
// 共用绘制与动作输入，风格差异由配置提供。
export function drawWheel(c, x, y, phase) {
  const side = Math.sign(x);
  oval(c, x, y + 10, 10, 4, '#243c3438');
  oval(c, x, y, 9, 12, style.pineWheels.tire, outline, style.pineWheels.tireStrokeWidth);
  c.save();
  c.beginPath();
  c.ellipse(x, y, 8, 11, 0, 0, Math.PI * 2);
  c.clip();
  for (let i = 0; i < style.pineWheels.treadCount; i++) {
    const angle = phase + (i * Math.PI) / style.pineWheels.drawWheelValue3;
    if (Math.cos(angle) <= 0) continue;
    const treadY = y + Math.sin(angle) * 11;
    c.strokeStyle = style.pineWheels.drawWheel_strokeStyleColor;
    c.lineWidth = style.pineWheels.drawWheel_lineWidthValue;
    // 细节开关只控制局部绘制，保留共同分层与动作输入。
    if (!style.pineWheels.fineDetails) {
      c.lineCap = 'round';
    }
    c.beginPath();
    c.moveTo(x - 7, treadY - 0.7);
    c.lineTo(x + 7, treadY + 0.7);
    c.stroke();
  }
  c.restore();
  const hubX = x + side * 5;
  oval(c, hubX, y + 1, 4.5, 8, style.pineWheels.wheel, outline, style.pineWheels.drawWheelValue4);
  for (let i = 0; i < 3; i++) {
    const angle = phase + (i * Math.PI * 2) / 3;
    c.strokeStyle = style.pineWheels.drawWheel_strokeStyleColor2;
    c.lineWidth = style.pineWheels.drawWheel_lineWidthValue2;
    c.beginPath();
    c.moveTo(hubX, y + 1);
    c.lineTo(hubX + Math.cos(angle) * 3.5, y + 1 + Math.sin(angle) * 6.5);
    c.stroke();
  }
  oval(
    c,
    hubX,
    y + 1,
    style.pineWheels.drawWheelValue5,
    style.pineWheels.drawWheelValue6,
    style.pineWheels.drawWheelColor3,
    outline,
    0.8,
  );
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawPineRear(c, phase = 0) {
  oval(c, 0, 15, 47, 15, '#243c3430');
  box(
    c,
    -32,
    -18,
    64,
    34,
    style.pineWheels.drawPineRearValue,
    style.pineWheels.drawPineRearColor,
    outline,
    style.pineWheels.drawPineRearValue2,
  );
  for (const y of [-17, 16]) for (const x of [-35, 35]) drawWheel(c, x, y, phase);
  box(
    c,
    -28,
    -23,
    56,
    40,
    style.pineWheels.drawPineRearValue3,
    style.pineWheels.hull,
    outline,
    style.pineWheels.drawPineRearValue4,
  );
  for (const y of [-26, 7])
    for (const x of [-36, 27]) {
      box(
        c,
        x,
        y,
        9,
        5,
        style.pineWheels.drawPineRearValue2,
        style.pineWheels.hullLight,
        outline,
        style.pineWheels.drawPineRearValue5,
      );
    }
  style.pineWheels.fineDetails ? oval(c, 0, -13, 22, 10, '#3b5742') : oval(c, 0, -13, 22, 10, '#706744', outline, 3.2);
}
// 共用绘制与动作输入，风格差异由配置提供。
export function drawPineFront(c, hit = false) {
  box(
    c,
    -28,
    -6,
    56,
    25,
    style.pineWheels.drawPineFrontValue,
    hit ? '#f7e6ab' : style.pineWheels.drawPineFrontColor,
    outline,
    style.pineWheels.drawPineRearValue4,
  );
  box(c, -23, -3, 46, 6, style.pineWheels.drawPineFrontValue2, style.pineWheels.drawPineFrontColor2);
  box(
    c,
    -25,
    18,
    50,
    5,
    style.pineWheels.drawPineRearValue2,
    style.pineWheels.drawPineFrontColor3,
    outline,
    style.pineWheels.drawWheelValue4,
  );
  for (const x of [-24, 17])
    box(
      c,
      x,
      8,
      7,
      5,
      style.pineWheels.drawPineRearValue2,
      style.pineWheels.drawPineFrontColor4,
      outline,
      style.pineWheels.drawWheelValue4,
    );
  // 细节开关只控制局部绘制，保留共同分层与动作输入。
  if (style.pineWheels.fineDetails) {
    poly(
      c,
      [
        [-8, 9],
        [0, 5],
        [8, 9],
        [0, 14],
      ],
      '#d3ad60',
      outline,
      1.5,
    );
  } else {
    box(c, -8, 9, 16, 12, 3, '#d2bd78', outline, 1.8);
    for (const x of [-4, 0, 4]) box(c, x - 1, 12, 2, 6, 1, '#78794f');
  }
}
