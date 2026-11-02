// 建筑公司与小屋交通共用手机底板；只列当前楼层，不为高楼生成巨大按钮列表。
import {createEventScope} from '../platform/events.js';
import {buildHome,travelHomeFloor} from '../core/home-construction.js';
import {HOME_BUILD_PRICES,HOME_DIRECTIONS,HOME_ELEVATOR,homeFloors,floorBalconies} from '../config/home-construction.js';
import {COTTAGE_STAIRS,cottageFloor} from '../config/cottage.js';

// 施工支付和交通提交均由规则层再次校验，不把按钮禁用当作唯一限制。
export function createHomeConstruction({game,root,panel,dialogs,input,onChange}){
 const scope=createEventScope(),dialog=root.createElement('dialog'),entry=root.createElement('button');let mode='travel',message='';
 entry.id='home-travel-open';entry.className='ui-button';entry.textContent='楼层通行';panel.querySelector('footer').append(entry);
 dialog.id='home-construction-dialog';dialog.className='ui-panel ui-page';dialog.setAttribute('aria-labelledby','home-construction-title');
 dialog.innerHTML='<header class="ui-panel__header"><div><h2 id="home-construction-title" tabindex="-1"></h2><p id="home-construction-summary"></p></div><button class="ui-close" data-build-close aria-label="关闭建筑服务">×</button></header><div class="ui-panel__body" id="home-construction-content"></div><footer class="ui-panel__footer"><p id="home-construction-message" role="status"></p></footer>';root.body.append(dialog);
 const get=id=>root.getElementById('home-construction-'+id);
 // 明确施工价和目标楼层；电梯直达使用数字输入，百万楼层仍只需固定数量节点。
 function paint(){
  const h=game.progress.homeDecor,floors=homeFloors(h),floor=cottageFloor(game.cottage),near=site=>Math.hypot(game.player.x-site.landing.x,game.player.y-site.landing.y)<=site.radius;
  get('title').textContent=mode==='build'?'森筑建筑公司':'小屋楼层通行';get('summary').textContent=`已建 ${floors} 层 · ${mode==='build'?`金币 ${game.progress.coins} · 木材 ${game.progress.wood}`:`当前第 ${floor+1} 楼`}`;
  get('message').textContent=message;
  if(mode==='build'){
   const price=kind=>`${HOME_BUILD_PRICES[kind].coins} 金币 + ${HOME_BUILD_PRICES[kind].wood} 木材`;
   get('content').innerHTML=`<section class="ui-section"><h3>向上加盖</h3><p>每次增加一整层，楼梯自动接通，不设楼层上限。</p><button class="ui-button" data-build="floor">加盖第 ${floors+1} 楼 · ${price('floor')}</button></section><section class="ui-section"><h3>安装电梯</h3><p>一次安装，直达所有已建楼层；以后加盖也会自动接通。</p><button class="ui-button" data-build="elevator" ${h.elevator?'disabled':''}>${h.elevator?'电梯已安装':price('elevator')}</button></section><section class="ui-section"><h3>四向大阳台</h3><p>每层可分别安装。走到门口即可出屋，眺望真实营地。</p><label>楼层 <input class="ui-input" id="home-build-floor" type="number" inputmode="numeric" min="1" max="${floors}" value="${Math.min(floors,2)}" step="1"></label><label>朝向 <select class="ui-input" id="home-build-side">${Object.entries(HOME_DIRECTIONS).map(([id,d])=>`<option value="${id}">${d.name}侧</option>`).join('')}</select></label><button class="ui-button" data-build="balcony">加装大阳台 · ${price('balcony')}</button><p>已建阳台 ${Object.values(h.balconies||{}).reduce((n,s)=>n+s.length,0)} 处</p></section>`;
  }else{
   const stairs=near(COTTAGE_STAIRS),lift=h.elevator&&near(HOME_ELEVATOR);
   get('content').innerHTML=`<section class="ui-section"><h3>楼梯</h3><p>走到右侧楼梯前，选择上楼或下楼；站定一秒默认向上，顶层默认向下。</p><button class="ui-button" data-floor="${floor-1}" ${!stairs||floor===0?'disabled':''}>下楼至 ${floor} 楼</button><button class="ui-button" data-floor="${floor+1}" ${!stairs||floor+1>=floors?'disabled':''}>上楼至 ${floor+2} 楼</button></section><section class="ui-section"><h3>电梯</h3><p>${h.elevator?'走到左侧电梯门前，输入要去的楼层。':'可前往小屋东南侧的森筑建筑公司加装电梯。'}</p><label>目标楼层 <input class="ui-input" id="home-lift-floor" type="number" inputmode="numeric" min="1" max="${floors}" value="${floor+1}" step="1"></label><button class="ui-button" data-lift ${!lift?'disabled':''}>乘电梯前往</button></section><section class="ui-section"><h3>本层阳台</h3><p>${floorBalconies(h,floor).map(s=>HOME_DIRECTIONS[s].name+'侧').join('、')||'尚未安装'}。走到对应门口站定一秒，走出后可在平台自由活动。</p></section>`;
  }
 }
 dialogs.register(dialog.id,{focusId:'home-construction-title',onOpen:paint});
 // 只在公司或自家室内打开对应服务，阳台不会显示穿墙乘梯入口。
 function open(next='build'){if(next==='build'?game.cottage?.kind!=='construction':game.cottage?.kind!=='cottage'||game.cottage.balcony)return;mode=next;message='';input.reset();dialogs.open(dialog.id);}
 scope.on(entry,'click',()=>open('travel'));
 scope.on(dialog,'click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  if(b.hasAttribute('data-build-close')){dialogs.close(dialog.id);return;}
  if(b.dataset.build){const r=buildHome(game,b.dataset.build,{floor:Number(root.getElementById('home-build-floor')?.value)-1,side:root.getElementById('home-build-side')?.value});message=r.message;if(r.ok)onChange();paint();return;}
  const lift=b.hasAttribute('data-lift'),target=lift?Number(root.getElementById('home-lift-floor').value)-1:Number(b.dataset.floor);
  if(travelHomeFloor(game,target,lift?'elevator':'stairs')){dialogs.close(dialog.id);onChange();}else{message='请靠近对应设施，并选择有效的已建楼层。';get('message').textContent=message;}
 });
 // 组件只更新可见性，避免每帧刷新数字输入导致无法输入高层编号。
 function render(){entry.hidden=game.cottage?.kind!=='cottage'||!!game.cottage?.balcony;entry.disabled=!!game.cottage?.sleep;if(dialog.open&&!(mode==='build'?game.cottage?.kind==='construction':game.cottage?.kind==='cottage'&&!game.cottage.balcony))dialogs.close(dialog.id);}
 // 离开应用释放原生对话框与监听。
 function dispose(){if(dialog.open)dialogs.close(dialog.id);scope.dispose();dialog.remove();entry.remove();}
 return {open,render,dispose};
}
