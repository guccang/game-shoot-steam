// 远林低景只在镜头附近生成。花地、石坡、倒木沿地脚构图，车辆可以穿过。
import {WORLD, ORIGINAL_WORLD, wrap} from './coordinates.js';
import {pathDistance} from './paths.js';
import {isWaterScenery} from './river-geometry.js';
import {biomeAt} from './biomes.js';
import {HABITATS} from './forest-habitats.js';
import {monsterCampClearing} from '../config/monster-camps.js';
import {coversScenery,inCampComposition} from './forest-clearings.js';

const CELL=400, COLS=WORLD.width/CELL, ROWS=WORLD.height/CELL;
const groups=[
  [['stones',0,0,1.25],['flowers',-37,14,.76],['stones',61,-24,.55]],
  [['flowers',0,0,1.26],['flowers',37,12,.76],['flowers',-46,-20,.91],['flowers',-75,-7,.54]],
  [['driftwood',0,0,1.18],['flowers',24,6,.75],['stones',-47,18,.58]],
  [['stones',0,0,1.58],['stones',40,18,.88]],
  [['stones',0,0,1.22],['fern',-30,12,1.34],['fern',36,-10,.87]],
  [['stones',0,0,1.05],['mushrooms',20,9,1.3],['mushrooms',-32,-11,.86]],
  [['driftwood',0,0,1.23],['fern',-25,-4,1.42],['mushrooms',32,9,.97]],
];
const cells=new Map();

// 用标准格坐标决定位置，跨地图接缝或折返时都能看到同一个石坡。
function noise(col,row,salt){
  const n=Math.sin(col*127.1+row*311.7+salt*74.7)*43758.5453;
  return n-Math.floor(n);
}

// 每个格只检查一次道路和地标，固定大小的缓存随镜头移动自然替换。
function cellProps(col,row){
  const key=row*COLS+col;
  if(cells.has(key))return cells.get(key);
  const props=[], x=col*CELL+92+noise(col,row,1)*216, y=row*CELL+68+noise(col,row,2)*264;
  const mirror=noise(col,row,3)<.5?-1:1,scale=.82+noise(col,row,4)*.4;
  const choices=HABITATS[biomeAt(x,y).id].understory;
  const layout=groups[choices[Math.floor(noise(col,row,5)*choices.length)]];
  for(const [kind,dx,dy,size] of layout){
    const px=x+dx*mirror*scale, py=y+dy*scale;
    if(px<ORIGINAL_WORLD.width&&py<ORIGINAL_WORLD.height)continue;
    if(pathDistance(px,py)<60||isWaterScenery(px,py)||monsterCampClearing(px,py)||inCampComposition(px,py)||coversScenery(px,py))continue;
    props.push({type:'scenery',kind,x:px,y:py,size:size*scale});
  }
  if(cells.size>=256)cells.delete(cells.keys().next().value);
  cells.set(key,props);
  return props;
}

// 直接返回镜头所处的展开坐标；边缘留量覆盖低景图集，避免出屏前消失。
export function forestUnderstory(view){
  const result=[],margin=100;
  for(let row=Math.floor((view.y-margin)/CELL);row<=Math.floor((view.y+view.h+margin)/CELL);row++){
    for(let col=Math.floor((view.x-margin)/CELL);col<=Math.floor((view.x+view.w+margin)/CELL);col++){
      const c=wrap(col,COLS),r=wrap(row,ROWS);
      for(const item of cellProps(c,r)){
        result.push(c===col&&r===row?item:{...item,x:item.x+(col-c)*CELL,y:item.y+(row-r)*CELL});
      }
    }
  }
  return result;
}
