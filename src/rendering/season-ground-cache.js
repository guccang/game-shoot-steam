// 两套有界地块轮换：当前季节继续显示，下一季分帧就绪后才开始统一的季节渐变。
import {GroundCache,groundTiles} from './ground-cache.js';
import {GROUND_PAD} from './ground-tile.js';
import {MapPreviewCache} from './map-preview-cache.js';
import {mixRaster} from './season-raster.js';
import {drawAlignedTile} from './tile-blit.js';
import {SeasonTransition} from '../world/season-transition.js';
import {nextSeason,normalizeSeason,seasonRemaining} from '../world/seasons.js';
// 自动换季提前45秒准备；不足时继续旧季节外观，不改生活历法与天气规则。
export const SEASON_PREWARM_MS=45000;
const SUMS=['builds','hits','warmBuilds','syncMisses','buildMs','completedWork','slices'];

export class SeasonGroundCache {
  // 工厂只供调度测试注入轻量缓存，正式运行始终使用原精度GroundCache生成器。
  constructor(mapId='forest',season='summer',createCache=id=>new GroundCache(id)) {
    this.createCache=createCache;this.current=createCache(mapId);this.current.setSeason(normalizeSeason(season));
    this.seasons=new SeasonTransition(this.current.season);this.transition=this.seasons.sample(0);
    this.staged=null;this.source=null;this.requested=this.current.season;this.initialized=false;this.disposed=false;
    this.mapPreview=new MapPreviewCache();this.totals=Object.fromEntries(SUMS.map(key=>[key,0]));
    this.missReasons={};this.missSamples=[];this.maxSliceMs=0;this.maxWorkMs=0;this.events=[];this.commits=0;this.cancelled=0;
    this.prewarmAllowed=true;this.prewarmReason='idle';this.backgroundMs=0;
  }
  // 公开当前已发布的纹理，维持现有入场与诊断入口。
  get tiles(){return this.current.tiles;}
  // 营地搬迁同步刷新当前与过渡中的地面，避免旧院落在换季时重新出现。
  invalidateCampLayout(regions=null){for(const pool of this.pools())pool.invalidateCampLayout(regions);}
  // 风格切换重建各季节的派生纹理，保留同一调度器、请求、遮罩与渐变时钟。
  refreshArtStyle(){
    if(this.disposed)return;
    const night=this.current.requiredNight?1:0;
    for(const key of ['current','staged','source']){
      const previous=this[key];if(!previous)continue;
      const next=this.createCache(previous.mapId);
      next.setSceneryMask(this.mask);next.setSeason(previous.season);
      this.retire(previous);this[key]=next;
    }
    this.mapPreview.dispose();this.mapPreview=new MapPreviewCache();
    if(this.view)this.prepare(this.view,night);
  }
  // 场景实体使用已就绪的外观季节，而不是尚在构建中的请求。
  get season(){return this.current.season;}
  // 兼容冬景验收入口。
  get winter(){return this.current.winter;}
  // 累计所有缓存代际，切换对象不能把未命中数量归零。
  get syncMisses(){return this.totals.syncMisses+this.pools().reduce((n,p)=>n+p.syncMisses,0);}
  // 构建与渐变互斥，最多只保留当前和另一套纹理，禁止叠出第三季。
  pools(){return [this.current,this.staged,this.source].filter(Boolean);}
  // 仅记录状态变化，有界事件用于手机导出诊断。
  event(type,now,detail={}){this.events.push({type,at:now,...detail});if(this.events.length>24)this.events.shift();}
  // 归档计数后释放画布与未完成任务，历史统计不持有像素对象。
  retire(pool){
    if(!pool)return;const s=pool.stats();for(const key of SUMS)this.totals[key]+=s[key]||0;
    for(const [key,value] of Object.entries(s.missReasons||{}))this.missReasons[key]=(this.missReasons[key]||0)+value;
    this.missSamples.push(...(s.missSamples||[]));this.missSamples=this.missSamples.slice(-40);
    this.maxSliceMs=Math.max(this.maxSliceMs,s.maxSliceMs||0);this.maxWorkMs=Math.max(this.maxWorkMs,s.maxWorkMs||0);pool.dispose();
  }
  // 地图是真正不同的世界，释放旧世界两套纹理；地图总览缓存仍独立保留。
  setMap(mapId='forest'){
    if(this.current.mapId===mapId)return;
    this.retire(this.staged);this.retire(this.source);this.retire(this.current);
    this.current=this.createCache(mapId);this.staged=this.source=null;this.initialized=false;this.view=null;
  }
  // 遮罩改变同步取消预制，避免旧遮罩目标随后覆盖正确场景。
  setSceneryMask(arena=null){
    const key=arena?`${arena.x}:${arena.y}:${arena.radius}`:'';
    if(key===(this.maskKey||''))return;
    this.maskKey=key;this.mask=arena;this.retire(this.staged);this.retire(this.source);this.staged=this.source=null;
    this.current.setSceneryMask(arena);this.seasons.reset(this.season,performance.now());
  }
  // 当前与另一套缓存始终跟随同一视野，预制不会停留在换季前的旧位置。
  prepare(view,night=1){
    if(this.disposed)return;this.view=view;this.current.prepare(view,night);
    if(this.prewarmAllowed)this.staged?.prepare(view,1);this.source?.prepare(view,1);
  }
  // 当前帧战斗/负载门禁由主循环提供，不改变季节请求或销毁已完成的预制进度。
  setPrewarmPolicy(allowed,reason='idle'){this.prewarmAllowed=allowed;this.prewarmReason=reason;}
  // 整个有界工作集的昼夜层都齐备才可发布，移动到斜角或天黑不会立刻补建。
  fullyReady(pool){return !!pool?.desired?.size&&[...pool.desired].every(key=>pool.tiles.get(key)?.night);}
  // 请求下一套完整静态季节，不重画旧季节，也不烘焙重复的来源层。
  stage(season,now){
    if(this.staged?.season===season)return;
    if(this.staged){this.cancelled++;this.event('cancel',now,{season:this.staged.season});this.retire(this.staged);}
    this.staged=season===null?null:this.createCache(this.current.mapId);
    if(this.staged){this.staged.setSceneryMask(this.mask);this.staged.setSeason(season);this.event('prepare',now,{season});}
  }
  // 就绪后原子交换引用，旧纹理直接作为渐变来源；热切换本身不执行绘制任务。
  commit(now){
    this.source=this.current;this.current=this.staged;this.staged=null;
    this.seasons.set(this.season,now);this.commits++;this.event('commit',now,{season:this.season});
  }
  // 自动预热读生活历法剩余时间，手动预览读取原环境计时；连续请求只保留最新目标。
  update(environment,view,now=performance.now(),night=1,wallNow=Date.now()){
    if(this.disposed)return this.transition;
    const wanted=this.current.mapId==='jiuzhaigou'?'summer':normalizeSeason(environment.forestSeason);
    this.requested=wanted;
    if(!this.initialized){
      this.current.setSeason(wanted);this.seasons.reset(wanted,now);this.initialized=true;
    }
    let visual=this.seasons.sample(now);
    if(this.source&&!visual.active){
      const old=this.source;this.source=null;
      // 刚完成渐变就要求返回时，复用旧池而不先释放再重建。
      if(wanted!==this.season&&old.season===wanted)this.staged=old;else this.retire(old);
      this.event('release-source',now,{season:old.season});
    }
    if(!this.source){
      const ahead=this.current.mapId!=='jiuzhaigou'&&seasonRemaining(environment,wallNow)<=SEASON_PREWARM_MS;
      const target=wanted!==this.season?wanted:ahead?nextSeason(wanted):null;
      this.stage(target,now);
    }
    this.prepare(view,night);
    if(this.prewarmAllowed&&!this.source&&this.staged?.season===wanted&&this.fullyReady(this.staged)&&this.fullyReady(this.current))this.commit(now);
    this.transition=this.seasons.sample(now);return this.transition;
  }
  // 必需地面先使用预算；下一季仅使用显式空闲预算，每帧最多推进一步，不分享保底时间片。
  advance(budget=2,now=()=>performance.now(),backgroundBudget=budget){
    this.backgroundMs=0;if(this.disposed||!(budget>0))return;
    const start=now();this.current.advance(budget,now);
    const remaining=Math.max(0,budget-(now()-start));
    if(this.source&&remaining>0)this.source.advance(remaining,now);
    const spare=Math.max(0,Math.min(remaining,backgroundBudget-(now()-start)));
    if(this.staged&&this.prewarmAllowed&&spare>0){const before=now();this.staged.advance(Math.min(1,spare),now,1);this.backgroundMs=now()-before;}
  }
  // 仅当前画面及已开始的渐变来源可申请保底，未显示的下一季不得挤占战斗预算。
  needsWarmup(){return this.current.needsWarmup()||!!this.source?.needsWarmup();}
  // 入场只等待当前可见区域，不为了尚未来临的季节阻塞首屏。
  ready(view){return !this.disposed&&this.current.ready(view);}
  // 入场进度跟随当前季节的可见纹理，下一季后台缓存不参与加载百分比。
  readiness(view){return this.disposed?0:this.current.readiness(view);}
  // 两季同一坐标与原精度纹理参与既有混合，保留昼夜矩阵和周期边界对齐。
  draw(c,view,night){
    if(this.disposed)return;if(this.view!==view)this.prepare(view,night);
    const progress=this.transition?.progress??1;
    for(const spec of groundTiles(view)){
      const tile=this.current.get(spec,night),from=this.source?.get(spec,night);
      c.globalAlpha=1;
      drawAlignedTile(c,night>=1?mixRaster(from?.night,tile.night,progress):mixRaster(from?.day,tile.day,progress),GROUND_PAD,
        spec.x+spec.ox,spec.y+spec.oy,spec.w,spec.h);
      if(night>0&&night<1){c.globalAlpha=night;drawAlignedTile(c,mixRaster(from?.night,tile.night,progress),GROUND_PAD,
        spec.x+spec.ox,spec.y+spec.oy,spec.w,spec.h);}
    }
    c.globalAlpha=1;this.current.trim();this.source?.trim();
  }
  // 总览始终使用独立缓存，打开地图不能改变季节预制或渐变来源。
  drawMap(c,width,height,options={mapId:this.current.mapId,season:this.season}){return this.mapPreview.draw(c,width,height,options);}
  // 汇总两套像素与暂存工作，报告明确区分逻辑请求、显示季节和待发布进度。
  stats(){
    const pools=this.pools().map(p=>p.stats()),current=pools[0],result={...current,mapPreview:this.mapPreview.stats()};
    for(const key of SUMS)result[key]=this.totals[key]+pools.reduce((n,p)=>n+(p[key]||0),0);
    for(const key of ['bytes','pendingBytes','pending'])result[key]=pools.reduce((n,p)=>n+(p[key]||0),0);
    result.maxSliceMs=Math.max(this.maxSliceMs,...pools.map(p=>p.maxSliceMs||0));result.maxWorkMs=Math.max(this.maxWorkMs,...pools.map(p=>p.maxWorkMs||0));
    result.missReasons={...this.missReasons};for(const p of pools)for(const [key,n] of Object.entries(p.missReasons||{}))result.missReasons[key]=(result.missReasons[key]||0)+n;
    result.missSamples=[...this.missSamples,...pools.flatMap(p=>p.missSamples||[])].sort((a,b)=>a.at-b.at).slice(-40);
    result.seasonStaging={requested:this.requested,displayed:this.season,preparing:this.staged?.season||null,source:this.source?.season||null,
      required:this.staged?.desired?.size||0,ready:this.staged?[...(this.staged.desired||[])].filter(key=>this.staged.tiles.get(key)?.night).length:0,
      pools:pools.length,commits:this.commits,cancelled:this.cancelled,prewarmAllowed:this.prewarmAllowed,
      prewarmReason:this.prewarmReason,backgroundMs:this.backgroundMs,events:this.events.map(e=>({...e}))};return result;
  }
  // 销毁取消两套任务，归档后清空所有像素，不让后台任务继续发布。
  dispose(){if(this.disposed)return;this.retire(this.staged);this.retire(this.source);this.staged=this.source=null;this.current.dispose();this.mapPreview.dispose();this.disposed=true;}
}
