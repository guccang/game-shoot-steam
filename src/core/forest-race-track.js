// 跑步设施的局内效果、碰撞和对手路线，不修改永久成长或森林物体。
import {RACE,RACE_TURN,racePoint} from '../config/forest-race.js';
import {RACE_TRACK,inRaceFeature} from '../config/forest-race-track.js';
// 每名跑者独立记住本圈触发的加速带，站着或往返不能无限刷新。
export function createRaceTrackState(){return {boostLeft:0,muddy:false,bump:0,pads:{},boosts:0,bumps:0};}
// 暂停由上层截断，区域只在实际跑步时推进；加速乘区不代替冲刺体力。
export function tickRaceTrack(state,p,features,dt){state.boostLeft=Math.max(0,state.boostLeft-dt);state.bump=Math.max(0,state.bump-dt);state.muddy=features.some(f=>f.kind==='mud'&&inRaceFeature(p,f));return (state.boostLeft>0?RACE_TRACK.boostMultiplier:1)*(state.muddy?RACE_TRACK.mudMultiplier:1);}
// 顺向经过加速带每圈领取一次；进入后的效果有固定时间，不因停留重置。
export function triggerRaceTrack(state,p,features,progress,delta){if(delta<=1e-6||progress<0)return;const lap=Math.max(0,Math.floor(progress/RACE_TURN));for(const f of features)if(f.kind==='boost'&&inRaceFeature(p,f)&&(state.pads[f.id]===undefined||state.pads[f.id]<lap)){state.pads[f.id]=lap;state.boostLeft=RACE_TRACK.boostSeconds;state.boosts++;}}
// 跑道内外沿的同心椭圆保持原边界规则，设施不能把跑者挤出赛区。
function clampTrack(p,arena){const nx=(p.x-arena.x)/RACE.rx,ny=(p.y-arena.y)/RACE.ry,a=Math.atan2(ny,nx),span=RACE.halfWidth/Math.hypot(RACE.rx*Math.cos(a),RACE.ry*Math.sin(a)),radius=Math.max(1-span,Math.min(1+span,Math.hypot(nx,ny)));p.x=arena.x+Math.cos(a)*RACE.rx*radius;p.y=arena.y+Math.sin(a)*RACE.ry*radius;}
// 以小步推进并沿圆形草捆滑动，冲刺也不能穿透；碰撞不扣血且不改变圈数来源。
export function moveRaceRunner(p,dx,dy,arena,features,state){const old=Math.atan2((p.y-arena.y)/RACE.ry,(p.x-arena.x)/RACE.rx),steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));let hit=false;for(let i=0;i<steps;i++){p.x+=dx/steps;p.y+=dy/steps;clampTrack(p,arena);for(const f of features)if(f.kind==='bale'){const x=p.x-f.x,y=p.y-f.y,d=Math.hypot(x,y),radius=f.radius+RACE_TRACK.runnerRadius;if(d<radius){const angle=d>1e-7?Math.atan2(y,x):f.angle+Math.PI/2;p.x=f.x+Math.cos(angle)*radius;p.y=f.y+Math.sin(angle)*radius;hit=true;}}clampTrack(p,arena);}if(hit){if(state.bump<=0)state.bumps++;state.bump=.24;}const a=Math.atan2((p.y-arena.y)/RACE.ry,(p.x-arena.x)/RACE.rx);return Math.atan2(Math.sin(a-old),Math.cos(a-old));}
// 对手提前观察下一个设施，在三条宽路线间换道；不建立高频寻路网。
export function raceRivalInput(n,arena,features){const progress=(n.progress%RACE_TURN+RACE_TURN)%RACE_TURN;let lane=[-48,-6,36][n.index];const ahead=features.map(f=>({...f,gap:(f.at-progress+RACE_TURN)%RACE_TURN}));const pad=ahead.find(f=>f.kind==='boost'&&f.gap<.85);if(pad)lane=pad.lane+(n.index-1)*16;
 for(const f of ahead)if(f.kind!=='boost'&&(f.gap<.64||f.gap>RACE_TURN-.16)&&Math.abs(lane-f.lane)<(f.kind==='bale'?52:55)){const choices=[-65,0,65].filter(x=>Math.abs(x-f.lane)>=52);lane=choices.sort((a,b)=>Math.abs(a-lane)-Math.abs(b-lane))[0]??lane;}
 const a=Math.atan2((n.y-arena.y)/RACE.ry,(n.x-arena.x)/RACE.rx),target=racePoint(a+.16,arena,lane),dx=target.x-n.x,dy=target.y-n.y,length=Math.hypot(dx,dy)||1;return {x:dx/length,y:dy/length};}
