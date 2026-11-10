// 使用正式伐木入口分离复制、存档序列化、特效、死亡清理与空间索引耗时。
import {Game} from '../src/core/game.js';
import {freshProgress} from '../src/progression/progress.js';
import {MAINLINE_IDS} from '../src/config/mainline.js';
import {TOWN_RESTORATIONS} from '../src/config/town-restoration.js';
import {treeGrid} from '../src/world/spatial-grid.js';
import {createSaveStore} from '../src/platform/storage.js';
// 统计只记录耗时，不把不稳定的毫秒值作为通过条件。
export function measureTreeImpact(storage) {
 const data=new Map(),memory={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const store=createSaveStore(()=>storage||memory),p=freshProgress();p.arrival={version:3,phase:'complete',keys:true,parked:false};p.mainline.completed=[...MAINLINE_IDS];p.mainline.phase='complete';p.restoration.repaired=TOWN_RESTORATIONS.map(f=>f.id);
 const g=new Game(p,()=>.5);g.state='playing';g.vehicle.active=false;g.mainlineSpeech=null;g.livingPersist=store.saveProgress;if(store.saveWoodProgress)g.woodPersist=store.saveWoodProgress;
 const forestCount=g.trees.length,rows=[];treeGrid(g.trees);
 const clone=globalThis.structuredClone,stringify=JSON.stringify;let row;
 globalThis.structuredClone=(...args)=>{const t=performance.now();try{return clone(...args);}finally{if(row)row.clone+=performance.now()-t;}};
 JSON.stringify=(...args)=>{const t=performance.now();try{return stringify(...args);}finally{if(row)row.stringify+=performance.now()-t;}};
 const save=g.livingPersist,woodSave=g.woodPersist;
 g.livingPersist=p=>{const t=performance.now();try{return save(p);}finally{row.persist+=performance.now()-t;}};
 if(woodSave)g.woodPersist=p=>{const t=performance.now();try{return woodSave(p);}finally{row.persist+=performance.now()-t;}};
 const impact=g.fx.impact.bind(g.fx);g.fx.impact=(...args)=>{const t=performance.now();try{return impact(...args);}finally{row.fx+=performance.now()-t;}};
 try{for(let i=0;i<24;i++){
  g.progress.logistics.bagWood=0;const tree=g.trees.find(t=>t.hp>0);row={clone:0,stringify:0,persist:0,fx:0};let t=performance.now();g.hit(tree,99999);row.hit=performance.now()-t;
  t=performance.now();if(g.cleanupTrees)g.cleanupTrees();else if(g.trees.some(t=>t.hp<=0))g.trees=g.trees.filter(t=>t.hp>0);row.cleanup=performance.now()-t;
  t=performance.now();treeGrid(g.trees);row.index=performance.now()-t;rows.push(row);row=null;
 }}finally{globalThis.structuredClone=clone;JSON.stringify=stringify;}
 return {forestCount,storage:storage?'浏览器真实存储':'内存存储（不代表磁盘耗时）',rows};
}
