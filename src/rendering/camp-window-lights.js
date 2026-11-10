// 窗内暖光与迷雾光源读取同一窗洞目录，按建筑深度绘制，不覆盖前景角色。
import {CAMP_WINDOWS,CAMP_LIGHTING} from '../config/camp-lighting.js';
import {facilityOpen} from '../config/town-restoration.js';
import {homeExterior} from '../config/home-construction.js';
import {drawInsetWindow} from './building-materials.js';

// 只处理本帧真实存在且已修复的建筑，旧址、工地和背景车库层不发光。
export function buildingWindowLights(item,game){
 let kind=({'warehouse':'warehouse','warehouse-depot':'warehouse-depot','cat-home':'cat-home','furniture-shop':'furniture','construction-company':'construction','seed-shop':'seed','legendary-workshop':'legendary','repair-center':'garage','outdoor-shop':'garage','ammo-shop':'garage'})[item.type];
 if(item.type==='scenery')kind=item.kind==='garage'?'garage':item.kind==='cottage'?(item.workshop?'weapons':'cottage'):null;
 if(item.type==='regional-building')kind=item.kind;
 if(item.type==='living-facility'&&['relay','kitchen'].includes(item.kind))kind=item.kind;
 if(!CAMP_WINDOWS[kind]||kind==='weapons'&&!facilityOpen(game.progress,'weapons'))return [];
 const required=({'repair-center':'repair','outdoor-shop':'outdoor','ammo-shop':'ammo','cat-home':'cat-home','furniture-shop':'furniture','construction-company':'construction'})[item.type]||(item.type==='living-facility'?'neighbors':null)||(item.type==='scenery'&&['cottage','garage'].includes(kind)?kind:null);
 if(required&&!facilityOpen(game.progress,required))return [];
 const panes=[...CAMP_WINDOWS[kind]],size=item.size||1;
 if(kind==='cottage'){
  const {rows,lift}=homeExterior({floors:game.progress.homeDecor?.floors});
  panes.push([-10,-135*.63-lift-27,20,17]);
  for(let row=0;row<rows;row++)for(const x of [-52,22])panes.push([x,-135*.63-row*32-25,22,17]);
 }
 return panes.map(([x,y,w,h,shape],i)=>({x:item.x+(x+w/2)*size,y:item.y+(y+h/2)*size,radius:CAMP_LIGHTING.windowRadius,kind:'window',pane:{x:item.x+x*size,y:item.y+y*size,w:w*size,h:h*size,shape},building:item.id||item.type+'-'+item.x+'-'+item.y,index:i}));
}

// 灯芯按夜色渐亮，暖光保持在窗洞附近，窗棂与立面阴影继续可见。
export function drawCampWindowLights(c,windows,night){
 if(night<=.001||!windows?.length)return;
 c.save();c.globalAlpha*=night;
 for(const light of windows){const p=light.pane;
  c.save();c.globalCompositeOperation='screen';const r=Math.max(p.w,p.h)*1.25,g=c.createRadialGradient(light.x,light.y,0,light.x,light.y,r);
  g.addColorStop(0,'#ffe5a342');g.addColorStop(1,'#ffe5a300');c.fillStyle=g;c.fillRect(light.x-r,light.y-r,r*2,r*2);c.restore();
  if(p.shape==='pane'){c.fillStyle='#ffe7a8';c.fillRect(p.x,p.y,p.w,p.h);}else drawInsetWindow(c,p.x,p.y,p.w,p.h,true);
 }
 c.restore();
}
