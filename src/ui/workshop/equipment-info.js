// 工坊装备档案只读正式目录与拥有状态，不参与购买、试装和属性计算。
import {equipmentQuestReason,equipmentQuest} from '../../progression/equipment-quests.js';
import {WEAPONS} from '../../config/weapons.js';
import {COLLECTED_VEHICLES} from '../../config/vehicles.js';
import {VEHICLE_ARMAMENTS} from '../../config/vehicle-armaments.js';
import {WEAPON_STORIES,VEHICLE_STORIES,ARMAMENT_STORIES} from '../../config/equipment-stories.js';
import {storyEquipmentSource} from '../../progression/story-rewards.js';

// 先按车体校验专属主炮，避免与同编号的手持枪串档；已拥有时不再生成获取提示。
export function workshopEquipmentInfo(progress,{kind,index,turret=null}){
 const hull=kind==='vehicle',catalog=hull?COLLECTED_VEHICLES:WEAPONS;
 if(!Number.isInteger(index)||!catalog[index])return null;
 const native=hull?VEHICLE_ARMAMENTS.find(w=>w.weaponIndex===progress.vehicleLoadouts[index]):null;
 const armament=native&&turret===native.weaponIndex?native:null;
 const equipment=armament||catalog[index];
 const lore=(armament?ARMAMENT_STORIES:hull?VEHICLE_STORIES:WEAPON_STORIES)[equipment.id];
 const owned=!!(hull?progress.vehicleHulls:progress.weapons)?.[index];
 const quest=!armament&&equipmentQuest(kind,index);
 const storySource=storyEquipmentSource(progress,kind,index);
 const source=owned?'':quest?`${equipmentQuestReason(progress,kind,index)||`已完成《${quest.title}》，可在工坊购买`}。金币与材料另付。${storySource||''}`:storySource;
 return {id:equipment.id,name:equipment.name,description:equipment.description,...lore,owned,
  category:armament?'专属主武器档案':hull?'载具档案':'武器档案',
  source:owned?'':source||`在${hull?'载具':'武器'}工坊购买${armament?'对应车体后获得':''}。`,
 };
}

// 原生二级弹窗复用手机框架；打开时取当前选择，关闭时原位回到问号。
export function createWorkshopEquipmentInfo({root,dialogs,scope,selection,progress,onLegendary}){
 const $=id=>root.getElementById(id),help=root.createElement('dialog');
 help.id='ws-equipment-dialog';help.setAttribute('aria-labelledby','ws-equipment-name');
 help.innerHTML='<header><div><small id="ws-equipment-category"></small><h2 id="ws-equipment-name"></h2></div><button id="ws-equipment-close" type="button" aria-label="关闭装备档案">×</button></header><div class="ws-equipment-copy"><p id="ws-equipment-description"></p><p class="ws-equipment-maker">打造与传承 · <span id="ws-equipment-maker"></span></p><section class="ws-equipment-story"><small>营地珍藏 · 装备往事</small><h3 id="ws-equipment-story-title"></h3><div id="ws-equipment-story"></div></section><section id="ws-equipment-source-section"><h3>获取方式</h3><p id="ws-equipment-source"></p></section></div><button id="ws-legendary" type="button" hidden>红狼传承 · 传奇工坊</button><button id="ws-equipment-done" type="button" class="ui-button">返回工坊</button>';
 root.body.append(help);dialogs.register(help.id,{focusId:'ws-equipment-close'});
 scope.on($('ws-info'),'click',()=>{
  const model=workshopEquipmentInfo(progress(),selection());if(!model)return;
  for(const key of ['category','name','description','maker','source'])$(`ws-equipment-${key}`).textContent=model[key]||'';
  $('ws-equipment-story-title').textContent=model.title;
  $('ws-equipment-story').replaceChildren(...model.story.map(line=>{
   const p=root.createElement('p');p.textContent=line;return p;
  }));
  // 画像随故事一起重建，切换装备不会残留上一份档案的图片。
  if(model.illustration){
   const art=model.illustration,figure=root.createElement('figure'),img=root.createElement('img');
   const caption=root.createElement('figcaption'),failure=root.createElement('p');
   figure.className='ws-equipment-portrait';img.alt=art.alt;img.width=art.width;img.height=art.height;
   img.loading='lazy';img.decoding='async';caption.textContent=art.caption;
   failure.textContent='画像暂时无法加载，请关闭档案后重试。';failure.hidden=true;failure.setAttribute('role','status');
   // 明确显示资源失败，不以其他装备图片或占位画替代故事画像。
   img.addEventListener('error',()=>{img.hidden=true;failure.hidden=false;},{once:true});
   img.src=art.src;figure.append(img,failure,caption);$('ws-equipment-story').append(figure);
  }
  $('ws-equipment-source-section').hidden=!model.source;
  $('ws-legendary').hidden=model.id!=='red-wolf';
  dialogs.open(help.id);help.querySelector('.ui-panel__body').scrollTop=0;
 });
 scope.on($('ws-legendary'),'click',()=>onLegendary?.());
 for(const id of ['ws-equipment-close','ws-equipment-done'])scope.on($(id),'click',()=>dialogs.close(help.id));
 scope.on(help,'close',()=>{if($('workshop-dialog').open)$('ws-info').focus({preventScroll:true});});
 scope.on($('workshop-dialog'),'close',()=>{if(help.open)dialogs.close(help.id);});
 // 工坊卸载时一并清除档案，不遗留顶层模态和暂停状态。
 function dispose(){if(help.open)dialogs.close(help.id);help.remove();}
 return {dispose};
}
