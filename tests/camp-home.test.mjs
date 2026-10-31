import {requestParking} from '../src/core/parking.js';
// 停车下车、展示轮换与小屋状态专项测试，使用真实Game及正式存档迁移。
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/core/game.js';
import {freshProgress,validateProgress,freshRangerProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {PARKING_SPOTS} from '../src/config/parking.js';
import {boardParkedVehicle,updateParkingVisitors,parkedOwned} from '../src/core/camp-parking.js';
import {parkedVehicleObjects} from '../src/rendering/parked-vehicles.js';
import {arrivalObjects} from '../src/rendering/ranger-arrival.js';
import {COTTAGE} from '../src/config/cottage.js';
import {openCottageRest,enterCottage,leaveCottage,sleepInCottage,cottageBlocked,cancelCottageRest,cottageSleepTarget} from '../src/core/cottage.js';
import {calendarView} from '../src/world/living-calendar.js';
import {cottageRestTimeView} from '../src/ui/cottage-rest-time.js';
import {capturePatrol} from '../src/core/patrol-session.js';
import {blocked} from '../src/physics/motion.js';
import {LIVING_DAY_MS,LIVING_PHASES} from '../src/config/living-world.js';
import {RANGER} from '../src/config/ranger-arrival.js';
// 准备已完成主线的营地，不跳过正式停车和房屋更新。
function setup(){const p=freshProgress();p.mainline.completed=[...MAINLINE_IDS];p.vehicleHulls.fill(0);p.vehicleHulls[0]=1;p.vehicleIndex=0;const g=new Game(p,()=>.7);g.start();g.spawnTimer=999;return g;}
// 固定步长推进与真实运行一致的控制器。
function tick(g,seconds,input){for(let i=0;i<Math.ceil(seconds/.05);i++)g.update(.05,input);}
// 仅设置起始泊位附近位置，由正式控制器完成下车。
function park(g,id='weapons-west'){const s=PARKING_SPOTS.find(s=>s.id===id);g.summonVehicle();Object.assign(g.player,{x:s.x,y:s.approachY});requestParking(g);tick(g,8);return s;}

test('停车后车辆唯一留位、下车点可通行，近车上车保留耐久并阻止重停',()=>{
 const g=setup();g.vehicle.hp*=.6;const hp=g.vehicle.hp,s=park(g);
 assert.equal(g.vehicle.active,false);assert.equal(parkedVehicleObjects(g).filter(s=>s.owner).length,1);
 assert.ok(!blocked(g.player.x,g.player.y,12,g.trees,g.player));assert.ok(blocked(s.x,s.y-15,12,g.trees,g.player));
 Object.assign(g.player,{x:1000,y:900});assert.equal(g.summonVehicle(),false);
 Object.assign(g.player,{x:s.x+64,y:s.y+18});assert.equal(boardParkedVehicle(g,0),true);assert.equal(g.vehicle.hp,hp);
 assert.equal(g.progress.campParking.owned.length,0);tick(g,4);assert.equal(g.vehicle.active,true);assert.equal(g.parking.phase,'cancelled');
});
test('停车记录刷新保留并双重去重，旧交接电动车只显示一次',()=>{
 const g=setup();park(g,'garage');const p=validateProgress(JSON.parse(JSON.stringify(g.progress)));
 assert.equal(p.campParking.owned.length,1);const copy={...p.campParking.owned[0]};p.campParking.owned.push(copy,{...copy,hull:1},{...copy,spot:'fake'});
 assert.equal(validateProgress(p).campParking.owned.length,1);
 const old=setup();old.progress.vehicleHulls[5]=1;old.progress.arrival={version:2,phase:'complete',keys:true,parked:true};updateParkingVisitors(old,.05);
 assert.equal(parkedOwned(old).filter(s=>s.record.hull===5).length,1);assert.equal(arrivalObjects(old).filter(s=>s.type==='arrival-scooter').length,0);
});
// 快捷入口与场景上车共用核心，暂停允许取回原车但不能越过距离限制。
test('停驻车暂停后快捷上车仍可用，离车过远与室内不能取车',()=>{
 const g=setup(),s=park(g,'garage');g.pause();const hp=g.vehicle.hp;
 assert.equal(g.summonVehicle(),true);assert.equal(g.vehicle.hp,hp);assert.equal(g.progress.campParking.owned.length,0);
 assert.equal(g.state,'paused');assert.ok(Math.hypot(g.player.x-s.x,g.player.y-s.y)<.001);
});
// 点击不要求候满三秒，仍必须步行靠近，且出门锁仅约束自动入门。
test('小屋靠近点击立即进入，远处、驾驶和暂停拒绝，出门后允许主动再进',()=>{
 const g=setup();Object.assign(g.player,{x:COTTAGE.door.x+200,y:COTTAGE.door.y});assert.equal(enterCottage(g),false);
 Object.assign(g.player,{x:COTTAGE.door.x+60,y:COTTAGE.door.y+80});g.summonVehicle();assert.equal(enterCottage(g),false);g.dismountVehicle();
 g.pause();assert.equal(enterCottage(g),false);g.start();assert.equal(enterCottage(g),true);assert.equal(enterCottage(g),false);
 assert.equal(leaveCottage(g),true);assert.equal(enterCottage(g),true);assert.equal(g.summonVehicle(),false);
});
test('访客仅在视野外公共空位轮换，留两空位且不进入自有装备',()=>{
 const g=setup(),owned=[...g.progress.vehicleHulls];g.parkingView={x:100,y:100,w:500,h:400};g.parkingVisitTimer=0;
 updateParkingVisitors(g,1);assert.equal(g.parkingVisitors.length,0);
 g.parkingView={x:700,y:700,w:300,h:400};g.parkingVisitTimer=0;updateParkingVisitors(g,1);
 assert.ok(g.parkingVisitors.length>0&&g.parkingVisitors.length<=3);assert.ok(g.parkingVisitors.every(v=>v.spot.startsWith('north-')));
 const previous=JSON.stringify(g.parkingVisitors);g.parkingView={x:100,y:100,w:500,h:400};g.parkingVisitTimer=0;updateParkingVisitors(g,1);assert.equal(JSON.stringify(g.parkingVisitors),previous);
 assert.deepEqual(g.progress.vehicleHulls,owned);assert.equal(g.progress.campParking.owned.length,0);
});
test('门口站定三秒进入，出门后停留不会自动返回',()=>{
 const g=setup();g.progress.restoration.repaired=['cottage'];g.vehicle.active=false;Object.assign(g.player,{x:COTTAGE.door.x,y:COTTAGE.door.y+20,vx:0,vy:0});tick(g,2.9);assert.equal(g.cottage,null);tick(g,.2);
 assert.ok(g.cottage);assert.deepEqual({x:g.player.x,y:g.player.y},COTTAGE.spawn);
 assert.ok(leaveCottage(g));tick(g,5);assert.equal(g.cottage,null);assert.ok(enterCottage(g));
});
test('室内行走碰撞、出门坐标保存，睡眠只推进日历且保存失败不跳时',()=>{
 const g=setup();Object.assign(g.player,COTTAGE.door);enterCottage(g);const outside={...g.cottage.outside};
 capturePatrol(g);assert.deepEqual(g.progress.living.position,outside);
 const start=g.player.y;tick(g,.5,{x:0,y:-1});assert.ok(g.player.y<start);assert.ok(!cottageBlocked(g.player.x,g.player.y));
 assert.equal(sleepInCottage(g,'morning'),false);Object.assign(g.player,{x:119,y:158});assert.ok(!cottageBlocked(g.player.x,g.player.y));
 const old={...g.progress.living.calendar},coins=g.progress.coins;g.livingPersist=()=>false;
 assert.equal(sleepInCottage(g,'morning'),true);assert.equal(sleepInCottage(g,'morning'),false);tick(g,1.3);assert.deepEqual(g.progress.living.calendar,old);
 g.livingPersist=()=>true;g.progress.living.calendar.elapsed=1000;sleepInCottage(g,'morning');g.pause();tick(g,2);assert.equal(g.progress.living.calendar.elapsed,1000);g.start();tick(g,1.3);
 assert.equal(g.progress.living.calendar.day,old.day+1);assert.equal(g.progress.living.calendar.elapsed,0);assert.equal(g.progress.coins,coins);
 assert.ok(LIVING_DAY_MS>0);assert.equal(leaveCottage(g),true);assert.deepEqual({x:g.player.x,y:g.player.y},outside);
});
// 床边计时只负责展示选项，等待、暂停和取消都不直接推进日期。
test('床边十秒不弹窗，点击打开，暂停及远处不能打开，选项不改变日期',()=>{
 const g=setup();Object.assign(g.player,COTTAGE.door);enterCottage(g);assert.equal(openCottageRest(g),false);
 Object.assign(g.player,{x:119,y:158});const calendar=structuredClone(g.progress.living.calendar);tick(g,10);assert.equal(g.cottage.restOpen,false);
 g.pause();assert.equal(openCottageRest(g),false);g.start();assert.ok(openCottageRest(g));assert.equal(openCottageRest(g),false);assert.deepEqual(g.progress.living.calendar,calendar);
 const position={x:g.player.x,y:g.player.y};tick(g,2,{x:0,y:1});assert.deepEqual({x:g.player.x,y:g.player.y},position);
});
// 取消后允许原地再次点击，停留本身不弹窗。
test('休息选项取消后不重弹，两种选择正确跳时且睡醒不重复触发',()=>{
 const g=setup();Object.assign(g.player,COTTAGE.door);enterCottage(g);Object.assign(g.player,{x:119,y:158});openCottageRest(g);
 assert.ok(cancelCottageRest(g));tick(g,4);assert.equal(g.cottage.restOpen,false);assert.ok(openCottageRest(g));cancelCottageRest(g);
 Object.assign(g.player,{x:200,y:250});tick(g,.05);Object.assign(g.player,{x:119,y:158});openCottageRest(g);assert.equal(g.cottage.restOpen,true);
 g.progress.living.calendar.elapsed=1000;const expected=1000+calendarView(g.progress.living.calendar).remaining;
 assert.ok(sleepInCottage(g,'phase'));assert.equal(g.cottage.restOpen,false);assert.equal(sleepInCottage(g,'phase'),false);tick(g,1.3);
 assert.equal(g.progress.living.calendar.elapsed,expected);tick(g,4);assert.equal(g.cottage.restOpen,false);
 Object.assign(g.player,{x:200,y:250});tick(g,.05);Object.assign(g.player,{x:119,y:158});openCottageRest(g);
 const day=g.progress.living.calendar.day;assert.ok(sleepInCottage(g,'morning'));tick(g,1.3);
 assert.equal(g.progress.living.calendar.day,day+1);assert.equal(g.progress.living.calendar.elapsed,0);assert.equal(g.cottage.restOpen,false);
});
// 保存失败不兑现跳时，重新靠近仍能选择并重试。
test('休息保存失败保留日期，离开床边重新候睡后可成功重试',()=>{
 const g=setup();Object.assign(g.player,COTTAGE.door);enterCottage(g);Object.assign(g.player,{x:119,y:158});openCottageRest(g);
 const before=structuredClone(g.progress.living.calendar);g.livingPersist=()=>false;
 assert.ok(sleepInCottage(g,'morning'));tick(g,1.3);assert.deepEqual(g.progress.living.calendar,before);assert.match(g.cottage.notice,/没保存成功/);
 tick(g,4);assert.equal(g.cottage.restOpen,false);Object.assign(g.player,{x:200,y:250});tick(g,.05);Object.assign(g.player,{x:119,y:158});openCottageRest(g);
 assert.equal(g.cottage.restOpen,true);g.livingPersist=()=>true;sleepInCottage(g,'morning');tick(g,1.3);assert.equal(g.progress.living.calendar.day,before.day+1);
});
// 门垫停留一秒自动退出，暂停保持进度，恢复外部落点。
test('出口一秒自动退出，暂停不累计；睡眠中禁止退出',()=>{
 const g=setup();g.progress.restoration.repaired=['cottage'];g.vehicle.active=false;Object.assign(g.player,COTTAGE.door);enterCottage(g);const outside={...g.cottage.outside};
 Object.assign(g.player,COTTAGE.exit);tick(g,.5);assert.ok(g.cottage);
 g.pause();tick(g,2);assert.ok(g.cottage);assert.equal(leaveCottage(g),false);g.start();tick(g,.5);assert.equal(g.cottage,null);assert.deepEqual({x:g.player.x,y:g.player.y},outside);
 enterCottage(g);Object.assign(g.player,{x:119,y:158});sleepInCottage(g,'phase');assert.equal(leaveCottage(g),false);
});
// 新开场九秒接送仍由导演推进，不被附近点击或停车候选抢占。
test('入职接送不被普通停车或访客接管，交接后进入采木任务',()=>{
 const g=new Game(freshRangerProgress(),()=>.8);g.start();
 for(let i=0;i<220;i++){g.update(.05);assert.equal(g.parking,null);}
 assert.equal(g.progress.arrival.phase,'gather');assert.ok(Math.hypot(g.player.x-RANGER.doorstep.x,g.player.y-RANGER.doorstep.y)<1);
 assert.equal(g.progress.campParking.owned.length,0);
});

// 昼夜钟点与显示差值覆盖时段起点、午夜前后及只剩一分钟的边界。
test('休息时间预告展示当前钟点、醒来钟点和跨夜时长',()=>{
 const cases=[
  ['day',0,'06:00 · 白昼','18:00 · 跳过12小时','06:00 · 跳过24小时'],
  ['day',.625,'13:30 · 白昼','18:00 · 跳过4小时30分','06:00 · 跳过16小时30分'],
  ['dusk',0,'18:00 · 黄昏','20:00 · 跳过2小时','06:00 · 跳过12小时'],
  ['dusk',.5,'19:00 · 黄昏','20:00 · 跳过1小时','06:00 · 跳过11小时'],
  ['night',0,'20:00 · 夜晚','06:00 · 跳过10小时','06:00 · 跳过10小时'],
  ['night',.3,'23:00 · 夜晚','06:00 · 跳过7小时','06:00 · 跳过7小时'],
  ['night',.4,'00:00 · 夜晚','06:00 · 跳过6小时','06:00 · 跳过6小时'],
  ['night',.6,'02:00 · 夜晚','06:00 · 跳过4小时','06:00 · 跳过4小时'],
  ['night',.99999,'05:59 · 夜晚','06:00 · 跳过1分','06:00 · 跳过1分'],
 ];
 for(const [id,fraction,current,phase,morning] of cases){
  const period=LIVING_PHASES.find(p=>p.id===id),elapsed=period.start+period.duration*fraction;
  const calendar={day:2,elapsed},before={...calendar};
  assert.deepEqual(cottageRestTimeView(calendar),{current,phase,morning});assert.deepEqual(calendar,before);
 }
});
// 全部时段分别点击两种选项，结算必须兑现同一预告，不受过渡期间自然跨段影响。
test('休息时间预告与实际结算一致，点击后跨段不改变目标',()=>{
 for(const phase of LIVING_PHASES)for(const mode of ['phase','morning']){
  const g=setup();Object.assign(g.player,COTTAGE.door);enterCottage(g);Object.assign(g.player,{x:119,y:158});
  g.progress.living.calendar={day:2,elapsed:phase.start+phase.duration-1};
  const expected=cottageSleepTarget(g.progress.living.calendar,mode);
  assert.ok(sleepInCottage(g,mode));
  g.progress.living.calendar={...expected,elapsed:1000};tick(g,1.3);
  assert.deepEqual(g.progress.living.calendar,expected);
 }
});
