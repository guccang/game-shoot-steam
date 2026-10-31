import {awardCampXp} from '../progression/camp-level.js';
import {creditResource} from '../progression/resource-wallet.js';
import { GAMEPLAY_VALUES } from '../config/gameplay-values.js';
// 比赛会话管理：正式弹道和刚体负责推球，此处只处理出生、计分和一次结算。
import { FOOTBALL, footballGuns, footballReward, insideFootballField } from '../config/slime-football.js';
import { createMagazines } from '../combat/magazine.js';
import { createPulseState } from '../combat/pulse.js';
import { createWeaponCycle } from '../combat/grenades.js';
import { recordEconomy } from '../progression/economy-ledger.js';

// 准备页换枪不开始计时，也不动森林弹仓。
export function chooseFootballGun(game,index){const r=game.realm;if(r?.mode!=='football'||r.phase!=='build'||!footballGuns(game.progress).includes(index))return false;r.gun=index;r.equipment=null;return true;}
// 每次只开始一局，刷新沿用秘境检查点规则，未结算场次从头开始。
export function startFootball(game){const r=game.realm;if(r?.mode!=='football'||r.phase!=='build')return false;r.phase='combat';r.remaining=FOOTBALL.duration;r.score=0;r.warning=GAMEPLAY_VALUES.football.warningSeconds;r.spawnTimer=0;r.spawned=0;r.goalFlash=0;r.rings=[];game.enemies=[];game.projectiles=[];game.magazines=createMagazines(game.loadout);game.pulse=createPulseState();game.weaponCycle=createWeaponCycle();game.attackTimer=0;game.player.x=r.arena.x;game.player.y=r.arena.y+GAMEPLAY_VALUES.football.playerSpawnY;game.state='playing';return true;}
// 不会被伤害打死的比赛史莱姆，使用原怪物轮廓、受击翻滚和质量碰撞。
function spawnBall(game){const r=game.realm;const x=r.arena.x+(game.random()-.5)*GAMEPLAY_VALUES.football.spawnWidth,y=r.arena.y+GAMEPLAY_VALUES.football.spawnOffsetY+game.random()*GAMEPLAY_VALUES.football.spawnHeight;if(game.enemies.some(e=>e.hp>0&&Math.hypot(e.x-x,e.y-y)<GAMEPLAY_VALUES.football.spawnSpacing))return false;
 // 内圈停球，外圈留给玩家绕后，防止球被顶在外墙后无法救回。
 const e=game.spawnEnemy(0,0,{x,y});Object.assign(e,{football:true,realm:true,arena:{...r.arena,radius:FOOTBALL.ballRadius},species:'slime',biome:'meadow',rank:0,level:0,tough:false,flying:false,hp:1,maxHp:1,damage:0,speed:0,mass:GAMEPLAY_VALUES.football.mass,radius:GAMEPLAY_VALUES.football.radius,assault:null});r.spawned++;return true;}
// 时间到或主动离场均结算已得分；先锁定完成状态，防止重复事件发奖。
export function finishFootball(game){const r=game.realm;if(r?.mode!=='football'||r.phase!=='combat')return false;r.phase='won';r.cleared=1;r.earnings=footballReward(r.score);r.remaining=Math.max(0,r.remaining);game.state='realm';game.projectiles=[];game.aimLock=null;
 for(const [key,n]of Object.entries(r.earnings))r.earnings[key]=creditResource(game.progress,key,n);
 if(r.remaining<=1e-8&&r.score>0)awardCampXp(game.progress,'football');
 recordEconomy(game.progress,'income','realm:football',r.earnings);recordEconomy(game.progress,'challenge','football:'+r.score);
 // 累计与最高分在同一次结算更新，已完成状态阻止重复计入；普通离场也走此路径。
 r.equipment=null;const record=game.progress.realms.records.football;record.totalGoals=Math.min(Number.MAX_SAFE_INTEGER-1,(record.totalGoals||0)+r.score);record.best=Math.max(record.best,r.score);record.clears++;return true;}
// 在正式物理之后判定进球，暂停和结束后不推进；低帧率不会重复计分。
export function updateFootball(game,dt){const r=game.realm;if(r?.mode!=='football'||r.phase!=='combat'||game.state!=='playing')return false;
 r.goalFlash=Math.max(0,(r.goalFlash||0)-dt);r.rings=(r.rings||[]).filter(s=>(s.life-=dt)>0);
 if(r.warning>0){r.warning=Math.max(0,r.warning-dt);return false;}
 r.remaining=Math.max(0,r.remaining-dt);
 for(const e of game.enemies){if(!e.football||e.hp<=0||e.scored||!insideFootballField(e,r.arena))continue;e.scored=true;e.hp=0;r.score++;r.goalFlash=.7;r.rings.push({x:e.x,y:e.y,life:.7});if(r.rings.length>8)r.rings.shift();game.float(e.x,e.y-26,'+1','#f4dca0',true);game.onEvent('football-goal',{score:r.score});}
 if(r.remaining<=1e-8)return finishFootball(game);
 r.spawnTimer-=dt;if(r.spawnTimer<=0&&game.enemies.filter(e=>e.hp>0).length<FOOTBALL.capacity){r.spawnTimer=spawnBall(game)?FOOTBALL.interval:GAMEPLAY_VALUES.football.spawnRetry;}
 return false;
}
