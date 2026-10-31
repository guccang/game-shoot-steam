import { canvasFont } from './text-style.js';
import { drawSpiderPreview } from './spider-armed.js';
import { drawMechanicalPreview } from './mechanical.js';
// 补给转轮与美术工作台共用正式绘制器，不引入备用装备贴图。
import { WEAPONS } from '../config/weapons.js';
import { drawWeapon } from './characters.js';
import { drawFunnelIcon } from './funnel.js';
import { drawVehicleIcon } from './vehicle.js';

// 在 240×150 转轮窗口绘制当前型号，控制器与车体仍使用独立绘制链。
export function drawExpeditionSlot(c, kind, index) {
  c.clearRect(0, 0, 240, 150);
  if (index === null) {
    c.fillStyle = '#87977d'; c.font = canvasFont(48); c.textAlign = 'center'; c.fillText('?', 120, 92);
    return;
  }
  c.save();
  if (kind === 'vehicle') { drawVehicleIcon(c, index); }
  else if(WEAPONS[index].controller==='spider'){c.translate(120,85);drawSpiderPreview(c,WEAPONS[index]);}
  else if (WEAPONS[index].controller === 'mechanical') { c.translate(120,85); drawMechanicalPreview(c,WEAPONS[index]);drawWeapon(c,index,0,0,1.4); }
  else if (WEAPONS[index].controller) drawFunnelIcon(c, 120, 74, 1.25, WEAPONS[index].controller);
  else { c.translate(105, 76); drawWeapon(c, index, 0, 0, index >= 8 ? 1.65 : 2.6); }
  c.restore();
}
