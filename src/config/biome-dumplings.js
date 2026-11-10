// 十五种地貌团子：身份、轮廓与攻击数值独立于绘制器，保留原团子碰撞体和成长。
export const BIOME_DUMPLINGS = [
  {id:'snowcap',name:'雪帽团子',habitat:'snowpeak',shape:'cap',width:24,height:35,color:'#b9d8d5',accent:'#f5f2d9',attack:'加速雪球',pattern:'single',speed:100,radius:11,windup:1.1},
  {id:'icehorn',name:'冰角团子',habitat:'snowpeak',shape:'horn',width:19,height:43,color:'#91bccb',accent:'#dcebe0',attack:'双冰锥',pattern:'fork',speed:165,radius:4,windup:1.0},
  {id:'avalanche',name:'雪崩团子',habitat:'snowpeak',shape:'stack',width:28,height:40,color:'#d2ddd2',accent:'#fff0ce',attack:'雪团落砸',pattern:'lob',speed:105,radius:8,splash:44,windup:1.5},
  {id:'lavapot',name:'熔心团子',habitat:'volcano',shape:'crater',width:25,height:34,color:'#ae8270',accent:'#efbb76',attack:'熔核抛射',pattern:'lob',speed:125,radius:7,splash:32,windup:1.2},
  {id:'ashfan',name:'灰烬团子',habitat:'volcano',shape:'fan',width:25,height:30,color:'#95958c',accent:'#e5bc8d',attack:'双轮灰烬',pattern:'fan',speed:125,radius:5,windup:1.0},
  {id:'obsidian',name:'黑曜团子',habitat:'volcano',shape:'plates',width:20,height:43,color:'#73867f',accent:'#c2cfaa',attack:'黑曜冲刺',pattern:'charge',speed:220,radius:4,windup:1.1,reach:110,lunge:.28,returning:.55,recovery:1.6},
  {id:'lotus',name:'莲叶水团',habitat:'lake',shape:'lotus',width:26,height:29,color:'#81bdb6',accent:'#d6e5ac',attack:'三瓣水珠',pattern:'fan',speed:105,radius:7,windup:1.1},
  {id:'bubble',name:'泡泡水团',habitat:'lake',shape:'bubbles',width:19,height:39,color:'#91c9d0',accent:'#e7eee0',attack:'蓄速巨泡',pattern:'single',speed:72,radius:14,windup:1.3},
  {id:'whirlpool',name:'漩涡水团',habitat:'lake',shape:'spiral',width:28,height:27,color:'#79aab9',accent:'#cee7da',attack:'旋流水环',pattern:'ring',speed:90,radius:5,windup:1.5},
  {id:'fern',name:'蕨叶团子',habitat:'rainforest',shape:'fronds',width:20,height:36,color:'#83ae76',accent:'#d2df9d',attack:'回旋叶刃',pattern:'fork',speed:150,radius:7,windup:1.0},
  {id:'orchid',name:'兰花团子',habitat:'rainforest',shape:'flower',width:22,height:33,color:'#b5b88e',accent:'#e6bdd0',attack:'花粉散射',pattern:'fan',speed:85,radius:9,windup:1.2},
  {id:'vine',name:'藤鞭团子',habitat:'rainforest',shape:'vines',width:18,height:40,color:'#6eaa8a',accent:'#c4dca1',attack:'藤鞭横扫',pattern:'wide',speed:190,radius:8,windup:1.25,reach:95,range:115},
  {id:'shale',name:'页岩团子',habitat:'strata',shape:'shelves',width:29,height:31,color:'#bea982',accent:'#ead9af',attack:'双段岩弹',pattern:'fork',speed:100,radius:11,windup:1.3},
  {id:'sandbell',name:'砂铃团子',habitat:'strata',shape:'bell',width:21,height:42,color:'#d0b477',accent:'#f2e2b3',attack:'流砂落击',pattern:'lob',speed:85,radius:9,splash:52,windup:1.7},
  {id:'riftcrystal',name:'裂晶团子',habitat:'rift',shape:'crystals',width:21,height:36,color:'#a9a0bd',accent:'#e0d2de',attack:'交错晶簇',pattern:'ring',speed:145,radius:4,windup:1.6},
].map(p=>Object.freeze({reach:230,range:290,recovery:2.4,...p,...{"snowcap":{"speed":180,"acceleration":250,"maxSpeed":370,"recovery":1.9},"icehorn":{"speed":420,"windup":0.85,"recovery":1.8},"avalanche":{"speed":290,"arcHeight":115,"windup":1.25},"lavapot":{"speed":330,"arcHeight":65,"windup":1,"recovery":2},"ashfan":{"speed":310,"volleys":2,"volleyGap":0.25,"windup":0.9},"obsidian":{"windup":0.9,"lunge":0.21},"lotus":{"speed":270},"bubble":{"speed":155,"acceleration":90,"maxSpeed":260},"whirlpool":{"speed":230,"curve":0.8},"fern":{"speed":360,"curve":0.85},"orchid":{"speed":255,"acceleration":-140,"minSpeed":150},"vine":{"pattern":"sweep","speed":0,"windup":0.85,"recovery":1.6},"shale":{"speed":325,"volleys":2,"volleyGap":0.22},"sandbell":{"speed":260,"arcHeight":145,"windup":1.35},"riftcrystal":{"speed":400,"volleys":2,"volleyGap":0.3,"windup":1.25}}[p.id]}));
export const BIOME_DUMPLING_BY_ID=Object.freeze(Object.fromEntries(BIOME_DUMPLINGS.map(p=>[p.id,p])));

// 弹道角度同时提供给预警和发射，不能出现提示与命中区域不一致。
export function dumplingShotAngles(profile,angle,volley=0){
  const offsets={sweep:[],charge:[0],single:[0],lob:[0],fork:[-.14,.14],fan:[-.28,0,.28],wide:[-.65,0,.65],ring:[0,Math.PI/2,Math.PI,Math.PI*1.5]};
  return offsets[profile.pattern].map(offset=>angle+offset+(volley&&profile.pattern==='ring'?Math.PI/4:0));
}
