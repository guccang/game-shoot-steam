// 非强制领主提示：首次就绪及每次清波提醒一次，不改变游戏或输入状态。
export class BossHint {
  // 时钟可注入，方便验证暂停、恢复与重复刷新不会延长提示。
  constructor(now = () => performance.now()) {
    this.now = now;
    this.key = null;
    this.shown = false;
    this.until = 0;
    this.completedWave = 0;
    this.sequence = 0;
  }

  // 暂停或打开面板立即收起；尚未展示的就绪提示等待回到战场再出现。
  update({ available, key, playing, completedWave = 0 }) {
    if (!available || key !== this.key || completedWave !== this.completedWave) {
      this.key = key;
      this.completedWave = completedWave;
      this.shown = false;
      this.until = 0;
    }
    if (!available || !playing) {
      this.until = 0;
      return false;
    }
    if (!this.shown) {
      this.shown = true;
      this.sequence++;
      this.until = this.now() + 2400;
    }
    return this.now() < this.until;
  }
}

// 世界坐标经当前镜头投影到 CSS 像素，兼容广角、脉冲偏移、DPR 与画布缩放。
export function bossPawOrigin(player, view, canvas, paw) {
  const x = canvas.left + (player.x - view.x) * view.zoom * canvas.width / view.width;
  const y = canvas.top + (player.y - 28 - view.y) * view.zoom * canvas.height / view.height;
  return { x: x - paw.left - paw.width / 2, y: y - paw.top - paw.height / 2 };
}

// 先从猫猫身上抬起，沿弧线跑向头像，再轻点两次淡出；全程点击穿透。
export function bossPawFrames(origin, reduced = false) {
  if (reduced) return [
    { transform: 'rotate(-18deg)', opacity: .9, offset: 0 },
    { transform: 'rotate(-18deg)', opacity: .9, offset: .84 },
    { transform: 'rotate(-18deg)', opacity: 0, offset: 1 },
  ];
  return [
    { transform: `translate(${origin.x}px, ${origin.y}px) rotate(-8deg) scale(.8)`, opacity: 0, offset: 0 },
    { transform: `translate(${origin.x}px, ${origin.y - 8}px) rotate(-8deg) scale(1.1)`, opacity: 1, offset: .1 },
    { transform: `translate(${origin.x * .52 + 24}px, ${origin.y * .52 - 30}px) rotate(-30deg)`, opacity: 1, offset: .25 },
    { transform: 'translate(7px, 9px) rotate(-22deg)', opacity: 1, offset: .42 },
    { transform: 'translate(-3px, -5px) rotate(-14deg)', opacity: 1, offset: .53 },
    { transform: 'translate(7px, 9px) rotate(-22deg)', opacity: 1, offset: .65 },
    { transform: 'translate(-3px, -5px) rotate(-14deg)', opacity: 1, offset: .76 },
    { transform: 'translate(7px, 9px) rotate(-22deg)', opacity: 1, offset: .87 },
    { transform: 'translate(7px, 9px) rotate(-22deg)', opacity: 0, offset: 1 },
  ].map(frame => ({ ...frame, easing: 'ease-in-out' }));
}
