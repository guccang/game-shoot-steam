// 森林运动会共用赛道、体力与奖励配置；角色成长和载具不参与跑步速度。
export const RACE = Object.freeze({laps:2,countdown:3,duration:90,speed:160,boost:1.45,drain:34,recover:22,
  rx:280,ry:210,halfWidth:100,arena:{x:900,y:700,radius:390,terrain:'race'},
  rivals:[{name:'薄荷',hero:1,speed:141,lane:-78},{name:'栗子',hero:3,speed:148,lane:-26},{name:'松露',hero:4,speed:154,lane:26}]});
export const RACE_TURN = Math.PI*2;
// 起点在跑道下沿，沿箭头顺时针跑；换圈时沿用连续角度。
export function racePoint(angle,arena=RACE.arena,lane=0){return {x:arena.x+Math.cos(angle)*(RACE.rx+lane),y:arena.y+Math.sin(angle)*(RACE.ry+lane)};}
// 只有完赛发奖，提前退出与超时不发放；名次越高奖励越多。
export function raceReward(place){const rows=[[240,90,3],[180,70,2],[120,50,1],[80,30,0]],row=rows[place-1]||[0,0,0];return {coins:row[0],wood:row[1],parts:row[2],crystal:0,core:0};}
// 比赛纪录只显示已完赛的最快时间，不用零值冒充成绩。
export function raceTime(seconds){return `${Math.max(0,seconds||0).toFixed(1)} 秒`;}

// 名次采用已冲线顺序和真实跑程，暂停时不继续推进对手。
export function racePlace(r){return r.place||1+r.rivals.filter(n=>n.finish!==null||n.progress>r.distance+1e-6).length;}
