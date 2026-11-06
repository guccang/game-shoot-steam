// 家园小游戏隔离回合、输入和结算，不修改真实鸟类、矿道、装备弹药或世界坐标。
import {HOME_ARCADE,ARCADE_BIRDS,ARCADE_MINERALS,ARCADE_CLAW as C} from '../config/home-arcade.js';
import {homeFloors,floorBalconies} from '../config/home-construction.js';
import {freshHomeArcade} from '../progression/home-arcade.js';
import {bindEconomy,economyFor} from '../config/economy.js';
import {capturePatrol} from './patrol-session.js';
import {createRecoil,triggerRecoil,updateRecoil} from '../combat/recoil.js';
import {updateCatMotion} from './cat-motion.js';
// 解锁检查以玩家实际所在阳台和已建楼层为准；地下从第一层开始开放。
export function homeArcadeAccess(game,kind){
 const r=game.cottage,h=game.progress.homeDecor;
 if(!r||game.player.hp<=0||r.sleep||r.glide)return {ok:false,message:'请先进入对应场所。'};
 if(kind==='birds'&&(r.kind!=='cottage'||!r.balcony||r.floor<HOME_ARCADE.birds.unlockFloor||r.floor>=homeFloors(h)||!floorBalconies(h,r.floor).includes(r.balcony)))return {ok:false,message:'建到第10楼，并在第10楼或更高楼层的阳台玩打飞鸟。'};
 if(kind==='gold'&&(r.kind!=='mine'||!h.basement))return {ok:false,message:'建好地下室后，从地下一层即可玩黄金矿工。'};
 if(!Object.hasOwn(HOME_ARCADE,kind))return {ok:false,message:'请选择有效小游戏。'};
 if(game.vehicle.active||r.ride)return {ok:false,message:'请先停车并下车，再开始小游戏。'};
 return {ok:true,message:''};
}
// 进入准备页时停止原施工与候停，实际位置保持不动，离场不触发自动下楼。
export function openHomeArcade(game,kind){
 const access=homeArcadeAccess(game,kind);if(!access.ok)return access;if(game.state!=='playing'||game.cottage.arcade)return {ok:false,message:'请先返回游戏场景。'};
 const r=game.cottage;r.autoDig=false;r.tool=null;r.dig=null;r.shaftWork=0;r.running=false;r.balconyExitElapsed=0;r.balconyLatch=true;game.sceneApproach=null;
 r.arcade={kind,phase:'ready',paused:false,time:0,remaining:HOME_ARCADE[kind].seconds,score:0,hits:0,shots:0,notice:'',birds:[],items:[],traces:[],recoil:createRecoil(),aim:{x:180,y:100},settled:false};
 game.onEvent?.('home-arcade-change');return {ok:true};
}
// 每局只创建有限目标，分行错开矿石避免重叠；新回合才重新抽取布局。
export function startHomeArcade(game,random=Math.random){
 const a=game.cottage?.arcade;if(!a||game.state!=='playing'||a.paused||a.phase==='playing'||a.phase==='result'&&!a.settled)return false;
 Object.assign(a,{phase:'playing',time:0,remaining:HOME_ARCADE[a.kind].seconds,score:0,hits:0,shots:0,notice:'',settled:false,reward:0,won:false,birds:[],items:[],traces:[],ammo:HOME_ARCADE.birds.magazine,reload:0,cooldown:0,spawn:0,nextId:1,claw:{angle:0,swingTime:0,length:C.minLength,phase:'swing',caught:null}});
 if(a.kind==='gold')for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const kinds=['gold','nugget','rock','gem'],kind=kinds[(row*4+col+Math.floor(random()*3))%kinds.length],spec=ARCADE_MINERALS[kind];
  a.items.push({id:a.nextId++,kind,x:45+col*88+(random()-.5)*16,y:145+row*100+(random()-.5)*22,...spec,removed:false});
 }
 // 极端随机布局也保留足够总分，避免整张矿区挖完仍无法达标。
 if(a.kind==='gold'&&a.items.reduce((sum,m)=>sum+m.value,0)<HOME_ARCADE.gold.target)Object.assign(a.items[0],{kind:'gem',...ARCADE_MINERALS.gem});
 return true;
}
// 结果页冻结计时和目标，未收回的抓取不计分；只有领取成功才能重开。
function finishRound(a){a.phase='result';a.won=a.score>=HOME_ARCADE[a.kind].target;a.reward=a.won?Math.min(HOME_ARCADE[a.kind].maxReward,Math.floor(a.score/HOME_ARCADE[a.kind].rewardDivisor)):0;a.notice=a.won?'目标达成！结算后可领取金币。':'本局结束，再练一局挑战目标吧。';}
// 领取纪录与金币用同一次保存，失败保留结果页供重试，成功后重复调用不会二次奖励。
export function settleHomeArcade(game){
 const a=game.cottage?.arcade;if(!a||a.phase!=='result')return {ok:false,message:'本局尚未结束。'};if(a.settled)return {ok:true,message:'本局已经结算。'};
 const next=bindEconomy(structuredClone(game.progress),economyFor(game.progress));next.homeArcade??=freshHomeArcade();const s=next.homeArcade[a.kind];s.best=Math.max(s.best,a.score);s.plays++;if(a.won)s.wins++;s.coins+=a.reward;next.coins+=a.reward;
 const snapshot=Object.create(game);snapshot.progress=next;next.patrol=capturePatrol(snapshot);
 try{if(game.livingPersist&&game.livingPersist(next)!==true)throw Error('未保存');}catch{a.notice='保存失败，奖励与纪录未改变，请点击结算重试。';return {ok:false,message:a.notice};}
 game.progress=next;a.settled=true;a.notice=a.reward?`已领取 ${a.reward} 金币，纪录已保存。`:'本局纪录已保存。';game.onEvent?.('home-arcade-change');return {ok:true,message:a.notice};
}
// 中途退出不领取奖励；结果页先安全结算，返回同一层与同一位置。
export function closeHomeArcade(game){const r=game.cottage,a=r?.arcade;if(!a)return false;if(a.phase==='result'&&!settleHomeArcade(game).ok)return false;r.arcade=null;r.balconyLatch=true;r.balconyExitElapsed=0;r.notice='已返回，位置与原设施保持不变。';game.onEvent?.('home-arcade-change');return true;}
// 局部暂停冻结回合；切后台触发系统暂停时，同一继续按钮恢复正式游戏循环。
export function pauseHomeArcade(game){const a=game.cottage?.arcade;if(!a)return false;if(game.state==='paused'){game.pause();a.paused=false;return game.state==='playing';}if(a.phase!=='playing')return false;a.paused=!a.paused;return true;}
// 装填使用小游戏专用弹夹，不读取或扣减背包与载具的任何实物弹药。
export function reloadArcadeGun(game){const a=game.cottage?.arcade;if(!a||a.kind!=='birds'||a.phase!=='playing'||a.paused||game.state!=='playing'||a.reload>0||a.ammo===HOME_ARCADE.birds.magazine)return false;a.reload=HOME_ARCADE.birds.reload;return true;}
// 点击即瞄准开枪；小屏提供最小触摸命中范围，一发只能击中距离最近的一只活鸟。
export function shootArcadeBird(game,x,y,radiusX=22,radiusY=22){
 const a=game.cottage?.arcade;if(!a||a.kind!=='birds'||a.phase!=='playing'||a.paused||game.state!=='playing'||![x,y].every(Number.isFinite)||x<0||x>360||y<0||y>240)return false;
 a.aim={x,y};if(a.reload>0||a.cooldown>0)return false;if(a.ammo<=0){reloadArcadeGun(game);return false;}
 a.ammo--;a.shots++;a.cooldown=HOME_ARCADE.birds.shotInterval;triggerRecoil(a.recoil,0);a.traces.push({x,y,life:.14});
 const hit=a.birds.filter(b=>!b.hit&&((b.x-x)/Math.max(b.radius+6,radiusX))**2+((b.y-y)/Math.max(b.radius+6,radiusY))**2<=1).sort((b,c)=>Math.hypot(b.x-x,b.y-y)-Math.hypot(c.x-x,c.y-y))[0];
 if(hit){hit.hit=true;hit.fall=.5;a.hits++;a.score+=hit.points;a.notice=`命中${hit.name}，+${hit.points}分`;}else a.notice='没有命中，试着预判飞行方向。';if(!a.ammo)a.reload=HOME_ARCADE.birds.reload;return true;
}
// 摆动时放钩，伸出途中可以提前收绳；收回过程中不能再次放钩或改变抓取方向。
export function dropArcadeClaw(game){const a=game.cottage?.arcade;if(!a||a.kind!=='gold'||a.phase!=='playing'||a.paused||game.state!=='playing')return false;if(a.claw.phase==='swing'){a.claw.phase='extend';return true;}if(a.claw.phase==='extend'){a.claw.phase='retract';return true;}return false;}
// 抓钩端点与正式绘制共用同一公式，绳索只伸缩，抓到后携带真实矿物实体。
export function arcadeClawPoint(claw){return {x:C.x+Math.sin(claw.angle)*claw.length,y:C.y+Math.cos(claw.angle)*claw.length};}
// 鸟群按连续翅膀时钟飞行，命中后仅下落与消散，不在同帧回收动作。
function updateBirds(a,dt,random){
 a.cooldown=Math.max(0,a.cooldown-dt);if(a.reload>0){a.reload=Math.max(0,a.reload-dt);if(a.reload===0)a.ammo=HOME_ARCADE.birds.magazine;}
 a.spawn-=dt;if(a.spawn<=0&&a.birds.filter(b=>!b.hit).length<HOME_ARCADE.birds.maxBirds){const spec=ARCADE_BIRDS[Math.floor(random()*ARCADE_BIRDS.length)],side=random()<.5?1:-1;a.birds.push({...spec,id:a.nextId++,x:side>0?-25:385,y:28+random()*165,baseY:28+random()*165,side,wing:random()*6.28,hit:false});a.spawn=HOME_ARCADE.birds.spawnInterval;}
 for(const b of a.birds){b.wing+=dt*12;if(b.hit){b.fall-=dt;b.y+=dt*90;}else{b.x+=b.side*b.speed*dt;b.y=b.baseY+Math.sin(a.time*2+b.id)*12;}}
 a.birds=a.birds.filter(b=>b.hit?b.fall>0:b.x>-50&&b.x<410);a.traces=a.traces.map(t=>({...t,life:t.life-dt})).filter(t=>t.life>0);updateRecoil(a.recoil,0,dt);
}
// 分段检测避免高帧间隔穿过小宝石，收回速度由捕获物重量决定。
function updateClaw(a,dt){
 const claw=a.claw;if(claw.phase==='swing'){claw.swingTime+=dt*HOME_ARCADE.gold.swingSpeed;claw.angle=Math.sin(claw.swingTime)*HOME_ARCADE.gold.swing;return;}
 if(claw.phase==='extend'){
  const step=HOME_ARCADE.gold.extendSpeed*dt,n=Math.max(1,Math.ceil(step/4));for(let i=0;i<n;i++){claw.length+=step/n;const p=arcadeClawPoint(claw),item=a.items.find(m=>!m.removed&&Math.hypot(m.x-p.x,m.y-p.y)<m.radius+5);if(item){claw.caught=item.id;claw.phase='retract';a.notice=`抓到${item.name}，正在收回`;break;}if(p.x<12||p.x>348||p.y>405){claw.phase='retract';break;}}
 }else{
  const item=a.items.find(m=>m.id===claw.caught),speed=HOME_ARCADE.gold.retractSpeed/(item?.weight||1);claw.length=Math.max(C.minLength,claw.length-speed*dt);
  if(claw.length===C.minLength){if(item&&!item.removed){item.removed=true;a.score+=item.value;a.hits++;a.notice=`收回${item.name}，+${item.value}分`;}claw.caught=null;claw.phase='swing';if(a.items.every(m=>m.removed))finishRound(a);}
 }
}
// 先拦截房间循环再推进小游戏，地下敌人、挖掘与阳台候停在整局期间保持原状态。
export function updateHomeArcade(game,dt,random=Math.random){
 const a=game.cottage?.arcade;if(!a)return false;if(game.state!=='playing'||a.paused)return true;dt=Math.max(0,Math.min(.05,dt));updateCatMotion(game.player.bodyAnimation,dt,0,false);game.player.vx=game.player.vy=0;
 if(a.phase!=='playing')return true;const step=Math.min(dt,a.remaining);a.time+=step;a.remaining=Math.max(0,a.remaining-step);if(a.kind==='birds')updateBirds(a,step,random);else updateClaw(a,step);if(a.remaining<=0&&a.phase==='playing')finishRound(a);return true;
}
