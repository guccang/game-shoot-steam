// 家园小游戏复用统一手机按钮与底板，操作输入交给独立核心，所有提示使用中文。
import {HOME_ARCADE} from '../config/home-arcade.js';
import {openHomeArcade,homeArcadeAccess,startHomeArcade,settleHomeArcade,closeHomeArcade,pauseHomeArcade,reloadArcadeGun,shootArcadeBird,dropArcadeClaw} from '../core/home-arcade.js';
import {createEventScope} from '../platform/events.js';
const rules={birds:'点击飞鸟瞄准射击。45秒内达到120分，快鸟分值更高；6发弹夹自动装填，也可手动装填。使用专用练习枪，不消耗背包弹药。',gold:'抓钩左右摆动，看准方向放钩。金块和宝石分数高，石头重、收回慢；只有拉回卷扬机才计分。60秒内达到250分。'};
// 两个入口分别放在阳台和矿区操作栏，锁定提示和核心资格保持一致。
export function createHomeArcade({game,renderer,root,panel,input}){
 const scope=createEventScope(),birdButton=root.createElement('button'),goldButton=root.createElement('button'),ui=root.createElement('section');
 birdButton.id='home-bird-game';birdButton.className='ui-button';birdButton.textContent='阳台打飞鸟';panel.querySelector('footer div').append(birdButton);
 goldButton.id='mine-gold-game';goldButton.className='ui-button';goldButton.textContent='黄金矿工';root.querySelector('#mine-controls .mine-actions').append(goldButton);
 ui.id='home-arcade-ui';ui.hidden=true;ui.innerHTML='<header class="ui-inset"><strong id="arcade-title"></strong><p id="arcade-score"></p><p id="arcade-supply"></p></header><section id="arcade-card" class="ui-inset"><h2 id="arcade-card-title"></h2><p id="arcade-rules"></p><p id="arcade-record"></p></section><footer><p id="arcade-message" role="status"></p><div><button id="arcade-action" class="ui-button ui-button--primary">开始挑战</button><button id="arcade-reload" class="ui-button" hidden>装填</button><button id="arcade-pause" class="ui-button" hidden>暂停</button><button id="arcade-exit" class="ui-button">返回</button></div></footer>';panel.append(ui);
 // 进入玩法先释放移动手势，未解锁或乘车状态不会创建游戏回合。
 function open(kind){input.reset();const result=openHomeArcade(game,kind);if(!result.ok&&game.cottage)game.cottage.notice=result.message;render();}
 scope.on(birdButton,'click',()=>open('birds'));scope.on(goldButton,'click',()=>open('gold'));
 // 结果页的重玩与返回均先结算，保存失败留在原页以便重试。
 scope.on(ui,'click',event=>{const button=event.target.closest('button'),a=game.cottage?.arcade;if(!button||!a)return;input.reset();if(button.id==='arcade-action'){if(a.phase==='ready')startHomeArcade(game);else if(a.phase==='result'){if(settleHomeArcade(game).ok)startHomeArcade(game);}else if(a.kind==='gold')dropArcadeClaw(game);}else if(button.id==='arcade-reload')reloadArcadeGun(game);else if(button.id==='arcade-pause')pauseHomeArcade(game);else if(button.id==='arcade-exit')closeHomeArcade(game);render();});
 // 点击画布只在正式小游戏投影内生效，暂停或界面按钮不会穿透为射击。
 function tap(event){const a=game.cottage?.arcade;if(!a)return false;const v=renderer.arcadeView;if(!v)return true;const rect=renderer.canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;if(x<v.x||x>v.x+v.width||y<v.y||y>v.y+v.height)return true;if(a.kind==='birds')shootArcadeBird(game,(x-v.x)/v.width*360,(y-v.y)/v.height*240,22/v.width*360,22/v.height*240);else dropArcadeClaw(game);return true;}
 // 每帧只更新文本与按钮状态，不重建触控节点；准备和结果使用同一手机底板。
 function render(){
  const r=game.cottage,a=r?.arcade;panel.dataset.arcade=String(!!a);ui.hidden=!a;birdButton.hidden=r?.kind!=='cottage'||!r.balcony;birdButton.disabled=!homeArcadeAccess(game,'birds').ok;birdButton.textContent=birdButton.disabled?'打飞鸟 · 10楼解锁':'阳台打飞鸟';goldButton.disabled=!homeArcadeAccess(game,'gold').ok;
  if(!a)return;const spec=HOME_ARCADE[a.kind],record=game.progress.homeArcade?.[a.kind],playing=a.phase==='playing',paused=a.paused||game.state!=='playing';
  root.getElementById('arcade-title').textContent=spec.name+(a.kind==='birds'?` · 第 ${r.floor+1} 楼`:` · 地下 ${r.depth||1} 层`);
  root.getElementById('arcade-score').textContent=`${a.score} / ${spec.target} 分 · 剩余 ${Math.ceil(a.remaining)} 秒`;
  root.getElementById('arcade-supply').textContent=a.kind==='birds'?`专用弹夹 ${a.ammo??spec.magazine} / ${spec.magazine}${a.reload>0?' · 装填 '+a.reload.toFixed(1)+'秒':''}`:a.claw?.phase==='retract'?'正在收回 · 重物更慢':'金块与宝石高分 · 石头收回慢';
  const card=root.getElementById('arcade-card');card.hidden=playing&&!paused;root.getElementById('arcade-card-title').textContent=paused?'已暂停':a.phase==='result'?(a.won?'挑战成功':'本局结束'):'准备开始';root.getElementById('arcade-rules').textContent=a.phase==='result'?`本局 ${a.score} 分，奖励 ${a.reward} 金币。${a.settled?'已结算。':'结算后保存纪录与奖励。'}`:rules[a.kind];root.getElementById('arcade-record').textContent=`最高 ${record?.best||0} 分 · 已玩 ${record?.plays||0} 局`;
  root.getElementById('arcade-message').textContent=a.notice||(playing?(a.kind==='birds'?'点击飞鸟开枪，预判飞行方向。':'看准摆动方向放钩，伸出时可提前收绳。'):'中途退出不结算，原位置和装备保持不变。');
  const action=root.getElementById('arcade-action');action.hidden=playing&&a.kind==='birds';action.disabled=paused||playing&&a.claw?.phase==='retract';action.textContent=a.phase==='ready'?'开始挑战':a.phase==='result'?'结算并再玩':a.claw?.phase==='extend'?'提前收绳':a.claw?.phase==='retract'?'收回中':'放下抓钩';
  const reload=root.getElementById('arcade-reload');reload.hidden=!playing||a.kind!=='birds';reload.disabled=paused||a.reload>0||a.ammo===spec.magazine;
  const pause=root.getElementById('arcade-pause');pause.hidden=!playing&&game.state!=='paused';pause.textContent=paused?'继续':'暂停';root.getElementById('arcade-exit').textContent=a.phase==='result'?'结算并返回':playing?'退出本局':'返回';
 }
 // 销毁界面只释放节点和监听，已结算存档由进度模块持有。
 function dispose(){scope.dispose();birdButton.remove();goldButton.remove();ui.remove();delete panel.dataset.arcade;}
 return {render,tap,dispose};
}
