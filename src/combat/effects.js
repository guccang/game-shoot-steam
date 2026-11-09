// 二维战斗表现：定向碎屑、枪烟、弹壳与扩散环；不参与伤害和存档。
import { stepFragment } from '../physics/motion.js';
import { BIOMES } from '../world/biomes.js';
import { isHordeGiant } from '../config/bosses.js';
export const FX_LIMIT = 260;
export class CombatFX {
  // 使用独立随机源，避免粒子数量影响暴击和关卡随机序列。
  constructor(random = Math.random) {
    this.random = random;
    this.items = [];
    this.shake = { life: 0, duration: 0.22, strength: 0, x: 1, y: 0 };
  }
  // 短促镜头冲量只改变视觉，强度封顶，不修改移动、瞄准或实际弹道。
  pulse(strength, direction) {
    if (this.shake.life > 0 && this.shake.strength > strength) return;
    this.shake = {
      life: 0.22,
      duration: 0.22,
      strength: Math.min(5, strength),
      x: direction.x,
      y: direction.y,
    };
  }
  // 限制瞬时粒子数量，长时间连射仍保持有界内存。
  add(kind, x, y, life, options = {}) {
    if (this.items.length >= FX_LIMIT) this.items.shift();
    this.items.push({
      kind,
      x,
      y,
      life,
      duration: life,
      vx: 0,
      vy: 0,
      size: 3,
      color: '#ffe6a1',
      angle: 0,
      spin: 0,
      z: 0,
      vz: 0,
      ...options,
    });
  }
  // 狙击与脉冲命中领主时增加局部破甲亮芯、定向冲击波与碎光，不额外伤害或震屏。
  bossImpact(target, direction, kind, hit = null) {
    const pulse = kind === 'pulse', x = hit?.x ?? target.x, y = hit?.y ?? target.y - 35,
      angle = Math.atan2(direction.y, direction.x), color = pulse ? '#a9ffe7' : '#ffe7a1';
    if(!isHordeGiant(target))this.add('impact-flash', x, y, 0.22, { size: pulse ? 52 : 38, angle, color });
    this.add('pressure', x, y, 0.32, { size: pulse ? 90 : 64, angle, color });
    this.add('ring', x, y, 0.3, { size: pulse ? 72 : 50, color });
    for (let i = 0; i < 6; i++) {
      const a = angle + (i - 2.5) * 0.28, speed = 130 + this.random() * 100;
      this.add('spark', x, y, 0.24, { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        angle: a, size: pulse ? 4 : 3, color });
    }
  }
  // 浮游炮的定向能量爆裂仅产生有限视觉粒子，不施加范围伤害或额外击退。
  funnelImpact(hit, bullet) {
    const angle = Math.atan2(bullet.dy, bullet.dx);
    this.add('funnel-burst', hit.x, hit.y, 0.34, {
      size: bullet.critical ? 40 : 32,
      angle,
      color: '#9ff3e4',
    });
    for (let i = 0; i < 7; i++) {
      const spread = angle + (i - 3) * 0.44 + (this.random() - 0.5) * 0.2;
      const speed = 90 + this.random() * 100;
      this.add('spark', hit.x, hit.y, 0.22 + this.random() * 0.16, {
        vx: Math.cos(spread) * speed,
        vy: Math.sin(spread) * speed,
        angle: spread,
        size: 3 + this.random() * 2,
        color: i % 2 ? '#8aeadc' : '#edffe2',
      });
    }
  }
  // 手枪抛出旋转弹壳并留下短烟，激光枪释放轻量能量微粒。
  fire(muzzle, angle, laser, kind = 'pistol') {
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    // 元素武器释放对应颜色的能量微粒，不抛出普通弹壳。
    if (kind === 'arc' || kind === 'frost') {
      const color = kind === 'arc' ? '#decfff' : '#c5f3ff';
      this.add('ring', muzzle.x, muzzle.y, 0.2, { size: 19, color });
      for (let i = 0; i < 4; i++) {
        const a = angle + (this.random() - 0.5) * 1.5;
        this.add('spark', muzzle.x, muzzle.y, 0.25, {
          vx: Math.cos(a) * 110,
          vy: Math.sin(a) * 110,
          size: 3,
          color,
        });
      }
      return;
    }
    if (kind === 'pulse') {
      this.pulse(5, { x: dx, y: dy });
      this.add('pulse-wave', muzzle.x, muzzle.y, 0.5, { size: 100, angle, color: '#a2fff0' });
      this.add('impact-flash', muzzle.x, muzzle.y, 0.22, { size: 65, angle, color: '#b4fff4' });
      return;
    }
    if (kind === 'sniper') {
      this.pulse(2.4, { x: dx, y: dy });
      this.add('pressure', muzzle.x, muzzle.y, 0.18, { size: 31, angle, color: '#e6f8ff' });
    }
    // 喷火枪没有弹壳，枪口只保留暖色热气，主火流由真实弹体绘制。
    if (kind === 'flame') {
      this.add('smoke', muzzle.x, muzzle.y, 0.2, {
        vx: dx * 75,
        vy: dy * 75,
        size: 6,
        color: '#ffac60',
      });
      return;
    }
    this.add('smoke', muzzle.x, muzzle.y, laser ? 0.16 : 0.32, {
      vx: dx * 30,
      vy: dy * 20 - 22,
      size: laser ? 5 : 4,
      color: kind === 'water' ? '#c6efff' : laser ? '#c8ffad' : '#eee4c4',
    });
    if (kind === 'water') {
      this.add('drop', muzzle.x, muzzle.y, 0.3, {
        vx: dx * 140,
        vy: dy * 140,
        vz: 25,
        z: 3,
        color: '#c2f5ff',
      });
      return;
    }
    if (!laser && kind !== 'ricochet')
      this.add('shell', muzzle.x - dx * 20, muzzle.y - dy * 20, 0.65, {
        vx: -dy * 62 - dx * 20,
        vy: dx * 35,
        z: 12,
        vz: 100,
        angle,
        spin: 12,
        color: '#e9bd62',
      });
  }
  // 脉冲前沿沿途掀起尘土、裂纹和飞屑；随机数只影响美术，不修改地图或攻击判定。
  pulseWake(x, y, bullet) {
    const angle = Math.atan2(bullet.dy, bullet.dx);
    this.add('pulse-scar', x, y, 0.8, { size: 26, angle, color: '#8bfff0' });
    this.add('pulse-wave', x, y, 0.48, { size: 70, angle, color: '#c7fff2' });
    for (const side of [-1, 1]) {
      const spread = angle + side * (0.55 + this.random() * 0.5);
      this.add('chip', x, y, 0.65, {
        vx: Math.cos(spread) * 220,
        vy: Math.sin(spread) * 220,
        vz: 100 + this.random() * 90,
        z: 3,
        size: 3 + this.random() * 3,
        angle: spread,
        spin: side * 10,
        color: '#a99875',
        material: 'wood',
      });
    }
  }
  // 命中火花位于真实交点，木片与怪物碎片沿来弹方向形成扇形喷散。
  impact(hit, direction, critical, laser, dead, water = false, power = 1, weaponKind = '') {
    // 高压水弹使用局部水冠，替代普通金色火花/碎片；不重复伤害或震动镜头。
    if(weaponKind==='hover-tide') {
      this.add('tide-splash',hit.x,hit.y,.38,{angle:Math.atan2(direction.y,direction.x),size:32,color:'#abeee3'});
      this.add('ring',hit.x,hit.y+10,.42,{size:24,color:'#8fd8d1'});
      return;
    }
    const tree = hit.target.type === 'tree',
      boss = hit.target.type === 'boss';
    const color = tree
      ? '#b68b54'
      : boss
        ? '#99af72'
        : BIOMES.find((zone) => zone.id === hit.target.biome)?.monster || '#b49acb';
    const heavy = power > 1;
    const scale = power > 2 ? 1.45 : 1;
    const angle = Math.atan2(direction.y, direction.x),
      count = dead ? (boss ? 30 : 18) + (heavy ? 14 : 0) : critical ? 10 : 6;
    if (heavy) {
      this.pulse(dead ? 4.8 : 3, direction);
      this.add('pressure', hit.x, hit.y, dead ? 0.4 : 0.2, {
        size: (dead ? 88 : 40) * scale,
        angle,
        color: weaponKind==='tank-125'?'#e6c58a':'#c8efff',
      });
      if(!isHordeGiant(hit.target))this.add('impact-flash', hit.x, hit.y, 0.14, {
        size: (dead ? 48 : 26) * scale,
        angle,
        color: weaponKind==='tank-125'?'#ffe3a2':'#f3fbff',
        ...(weaponKind==='tank-125'?{warm:true}:{}),
      });
    }
    // 普通怪死亡由正式残影表现圆润爆裂；命中层仅保留短火花，避免叠加长条碎片雨。
    if(dead&&!tree&&!boss){
      for(let i=0;i<3;i++){
        const a=angle+(i-1)*.45;
        this.add('spark',hit.x,hit.y,.16+i*.025,{vx:Math.cos(a)*65,vy:Math.sin(a)*65,size:2.5,angle:a,color:'#f3dfac'});
      }
      return;
    }
    this.add('ring', hit.x, hit.y, dead ? 0.38 : 0.18, {
      size: (dead ? (boss ? 82 : 36) : critical ? 23 : 13) * (heavy ? 1.35 : 1),
      color: laser ? '#d2ffaf' : '#fff0bc',
    });
    for (let i = 0; i < count; i++) {
      const a = angle + (this.random() - 0.5) * (dead ? 1.25 : 1.8),
        speed = ((dead ? 130 : 50) + this.random() * (dead ? 180 : 100)) * (heavy ? power : 1);
      this.add(
        i % 3 === 0 ? 'spark' : 'chip',
        hit.x,
        hit.y,
        (dead ? 1.1 : 0.45) + this.random() * (dead ? 0.65 : 0.3),
        {
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          z: 8 + this.random() * 12,
          vz: ((dead ? 120 : 65) + this.random() * 80) * (heavy && dead ? 1.4 : 1),
          material: tree ? 'wood' : 'slime',
          size: (2 + this.random() * (dead ? 10 : 3)) * (heavy && dead ? 1.25 : 1),
          color: i % 3 === 0 ? (laser ? '#e6ffbe' : '#fff3cc') : color,
          angle: a,
          spin: (this.random() - 0.5) * 16,
        },
      );
    }
    if (!tree)
      for (let i = 0; i < (dead ? 10 : 5); i++) {
        const a = angle + (this.random() - 0.5) * 1.7;
        this.add('drop', hit.x, hit.y, 0.5 + this.random() * 0.3, {
          vx: Math.cos(a) * 140,
          vy: Math.sin(a) * 140,
          z: 10,
          vz: 70 + this.random() * 60,
          color,
          size: 2 + this.random() * 3,
        });
      }
    if (water)
      for (let i = 0; i < 7; i++) {
        const a = angle + (this.random() - 0.5) * 2;
        this.add('drop', hit.x, hit.y, 0.55, {
          vx: Math.cos(a) * 120,
          vy: Math.sin(a) * 120,
          z: 8,
          vz: 90,
          color: '#b4efff',
          size: 2 + this.random() * 2,
        });
      }
    if (dead) {
      this.add('smoke', hit.target.x, hit.target.y - 12, 0.45, {
        size: boss ? 28 : heavy ? 26 : 14,
        color,
      });
      // 多层沿弹道扩开的尘团让木块和怪物碎片先爆开，再在重力下翻滚落地。
      if (heavy)
        for (let i = 0; i < 5; i++) {
          const spread = angle + (i - 2) * 0.35;
          this.add('smoke', hit.x, hit.y, 0.55 + i * 0.05, {
            vx: Math.cos(spread) * (90 + i * 25),
            vy: Math.sin(spread) * (90 + i * 25),
            size: 10 + i * 3,
            color: tree ? '#d9c39e' : color,
          });
        }
    }
  }
  // 使用时间步更新阻尼和重力；暂停由游戏层统一控制。
  update(dt) {
    this.shake.life = Math.max(0, this.shake.life - dt);
    for (const p of this.items) {
      p.life -= dt;
      if (['chip', 'shell', 'drop'].includes(p.kind)) stepFragment(p, dt);
      else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        const drag = Math.exp(-3 * dt);
        p.vx *= drag;
        p.vy *= drag;
      }
    }
    this.items = this.items.filter((p) => p.life > 0);
  }
}
