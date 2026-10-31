import { i18nText } from "../i18n/index.js";
// 章节配置加载前验证数据形状与交叉引用，错误配置不能带着半套会话进入游戏。
const TASKS=new Set(['idle','wave','route','defense','boss','travel','landing','timber']);
const ACTIONS=new Set(['stage','phase','flag','move','dialogue','target','wave','boss']);
// 验证纯数据合同；返回原定义，便于工具与测试直接复用。
export function validateStoryDefinition(def){
  // 带路径的报错帮助定位配置行，不用默认值掩盖拼写错误。
  function need(ok,path,message){if(!ok)throw Error(i18nText("core.story-schema.8ef5653e53", { p0: (path), p1: (message) }));}
  // 内容表不接受函数、非有限数或类实例，保证可导出为JSON。
  function data(value,path){
    need(value!==undefined&&typeof value!=='function',path,i18nText("core.story-schema.14b97fff1c"));
    if(typeof value==='number')need(Number.isFinite(value),path,i18nText("core.story-schema.9e470a2c01"));
    if(value&&typeof value==='object'){need(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype,path,i18nText("core.story-schema.66c41daf05"));
      for(const [key,v] of Object.entries(value))data(v,`${path}.${key}`);}
  }
  data(def,'chapter');
  // 奖励键白名单防止拼写错误被写进非资源字段或丢失于存档。
  for(const [key,value] of Object.entries(def.reward))need(['coins','wood','parts','crystal','core'].includes(key)&&Number.isInteger(value)&&value>=0,'reward.'+key,i18nText("core.story-schema.e03facdf45"));
  // 资源种类上限也约束后来新增的故事，零奖励不占展示名额。
  need(Object.values(def.reward).filter(value=>value>0).length<=3,'reward',i18nText("core.story-schema.180a254ffc"));
  // 站点引用同时校验坐标，导航、人物和任务执行共享同一来源。
  function site(id,path){need(Object.hasOwn(def.world.sites,id),path,i18nText("core.story-schema.78d2f2ad30", { p0: (id) }));}
  // 可读状态路径采用点分隔标识符，禁止原型路径。
  function pathKey(value,path){need(typeof value==='string'&&/^[a-zA-Z]\w*(\.\w+)*$/.test(value)&&!value.split('.').some(k=>['__proto__','prototype','constructor'].includes(k)),path,i18nText("core.story-schema.d4c46188a0"));}
  // 条件的所有分支都校验，不依赖当前章节恰好走到哪条路线。
  function condition(c,path){
    if(typeof c==='boolean')return;need(c&&typeof c==='object',path,i18nText("core.story-schema.88b5e7ec48"));
    if(c.all||c.any){const list=c.all||c.any;need(Array.isArray(list)&&list.length>0,path,i18nText("core.story-schema.809bb1f302"));list.forEach((x,i)=>condition(x,`${path}.${i}`));}
    else if(c.not!==undefined)condition(c.not,path+'.not');
    else if(c.flag)need(def.flags.includes(c.flag),path,i18nText("core.story-schema.684dadb0ba", { p0: (c.flag) }));
    else if(c.read)need(Object.hasOwn(def.dialogues,c.read),path,i18nText("core.story-schema.4690f7a6fe", { p0: (c.read) }));
    else if(c.stage)need(Object.hasOwn(def.nodes,c.stage),path,i18nText("core.story-schema.08e1e783b8", { p0: (c.stage) }));
    else if(c.path)pathKey(c.path,path);
    else need(false,path,i18nText("core.story-schema.ef36be1b94"));
  }
  // 字段绑定只读取状态或选择值，不把动态代码藏进配置。
  function binding(v,path){if(!v||typeof v!=='object')return;
    if('when' in v){condition(v.when,path);binding(v.then,path+'.then');binding(v.else,path+'.else');}
    else if(v.path)pathKey(v.path,path);else condition(v,path);
  }
  // 出生名额与上限校验防止无法完成的波次。
  function wave(w,path){need(w&&Number.isInteger(w.total)&&w.total>0&&Number.isInteger(w.cap)&&w.cap>0,path,i18nText("core.story-schema.f0ba8f8a94"));
    need(Number.isInteger(w.heavy??0)&&(w.heavy??0)>=0&&(w.heavy??0)<=w.total,path,i18nText("core.story-schema.77bfaf21af"));}
  // 动作参数须引用已存在内容，不能让未知动作在战斗中才报错。
  function actions(list,path){need(Array.isArray(list),path,i18nText("core.story-schema.79b1b8787a"));for(const [i,a] of list.entries()){
    const p=`${path}.${i}`;need(ACTIONS.has(a.type),p,i18nText("core.story-schema.82df9386cd", { p0: (a.type) }));
    if(a.type==='stage')need(Object.hasOwn(def.nodes,a.id),p,i18nText("core.story-schema.08e1e783b8", { p0: (a.id) }));
    if(a.type==='phase')need(['prepare','active'].includes(a.value),p,i18nText("core.story-schema.0d09a15d4d"));
    if(a.phase)need(['prepare','active'].includes(a.phase),p,i18nText("core.story-schema.553c879c72"));
    if(a.type==='flag')need(def.flags.includes(a.key),p,i18nText("core.story-schema.684dadb0ba", { p0: (a.key) }));
    if(a.type==='dialogue')need(Object.hasOwn(def.dialogues,a.id),p,i18nText("core.story-schema.4690f7a6fe", { p0: (a.id) }));
    if(a.type==='target')need(Object.hasOwn(def.targets,a.id),p,i18nText("core.story-schema.eba7e4e90f", { p0: (a.id) }));
    if(a.type==='boss')need(Object.hasOwn(def.encounters.bosses,a.id),p,i18nText("core.story-schema.2bebe1e882", { p0: (a.id) }));
    if(a.type==='move'||a.type==='wave')site(a.site,p);
    if(a.type==='wave')wave(a.wave,p);
  }}
  // 道具出现与字段变化也属于配置合同，不得绕过引用检查。
  function prop(p,path){need(['mail','sign','relay','crate','route','medicine','seedling'].includes(p.kind),path,i18nText("core.story-schema.f30da58f03"));site(p.site,path);
    if(p.when!==undefined)condition(p.when,path+'.when');for(const [k,v] of Object.entries(p.bind||{}))binding(v,path+'.'+k);}
  // 体验反馈只接受已实现事件、人物和有限匹配条件。
  const events=new Set(['impact','laser-pierce','charge-end','wave-start','wave-clear','supply','boss-start']);
  function match(spec,path){for(const [key,value] of Object.entries(spec||{})){
    pathKey(key,path);if(value&&typeof value==='object')need(Object.keys(value).length===1&&Number.isFinite(value.min),path,i18nText("core.story-schema.8d19287aad"));
    else need(['boolean','number','string'].includes(typeof value),path,i18nText("core.story-schema.1693ace7f4"));}}
  function speech(c,path){need(Object.hasOwn(def.actors,c.speaker),path,i18nText("core.story-schema.953ffb62be"));
    need(typeof c.text==='string'||['defense','boss'].includes(c.experienceText),path,i18nText("core.story-schema.8e26443424"));
    if(c.priority!==undefined)need(Number.isFinite(c.priority)&&c.priority>=0,path,i18nText("core.story-schema.3ed1c4231e"));}
  function line(l,path){need(Array.isArray(l)&&l.length===2&&Object.hasOwn(def.actors,l[0])&&typeof l[1]==='string',path,i18nText("core.story-schema.9531289a22"));}
  for(const [id,e] of Object.entries(def.journey.experiences)){
    need(events.has(e.event),id,i18nText("core.story-schema.6063df36b3"));match(e.match,id);speech({...e,text:e.feedback},id);
    if(e.loadout)need(def.loadouts.some(l=>l.id===e.loadout),id,i18nText("core.story-schema.21a34e4932"));
    need(typeof e.goal==='string'&&typeof e.success==='string',id,i18nText("core.story-schema.17c2f6e0a4"));
  }
  for(const [key,value] of Object.entries(def.journey.speech))need(Number.isFinite(value)&&value>0,'journey.speech.'+key,i18nText("core.story-schema.5af0695a53"));
  const cueIds=new Set();
  need(def.id&&Number.isInteger(def.version),'chapter',i18nText("core.story-schema.77ef1d48a5"));site(def.entry.site,'entry');
  need(Object.hasOwn(def.nodes,def.entry.stage)&&Object.hasOwn(def.dialogues,def.entry.dialogue),'entry',i18nText("core.story-schema.33f056a8e0"));
  for(const [id,p] of Object.entries(def.world.sites))need(Number.isFinite(p.x)&&Number.isFinite(p.y),`sites.${id}`,i18nText("core.story-schema.2bfa3933ee"));
  for(const p of def.world.paths)p.sites.forEach(id=>site(id,'paths'));
  for(const b of def.world.barriers||[])need(b.id&&[b.x,b.y,b.width,b.height].every(Number.isFinite)&&b.width>0&&b.height>0,'world.barriers','维修设施必须有有效坐标和碰撞尺寸');
  for(const p of def.world.approaches)site(p.site,'approaches');
  for(const p of def.world.validation.crosses)site(p.site,'crosses');
  for(const [id,a] of Object.entries(def.actors)){need(a.name&&['player','actor','site'].includes(a.source),`actors.${id}`,i18nText("core.story-schema.97a79d6504"));if(a.source==='site')site(a.site,`actors.${id}`);}
  for(const [id,a] of Object.entries(def.actors))if(a.appearance){const s=a.appearance;
    need(a.source==='actor'&&Number.isFinite(a.head)&&Number.isFinite(a.aside),'actors.'+id,i18nText("core.story-schema.68044890b4"));
    need(s.type==='boss'?['boar','mushroom','owl','turtle'].includes(s.kind):s.type==='monster'&&['slime','leaf-bat'].includes(s.species)&&['meadow','pine','amber','deep'].includes(s.biome),'actors.'+id,i18nText("core.story-schema.055c749b91"));
  }
  for(const [id,a] of Object.entries(def.actors))if(a.halfWidth!==undefined)need(Number.isFinite(a.halfWidth)&&a.halfWidth>0,'actors.'+id,i18nText("core.story-schema.c053f288ab"));
  for(const [id,d] of Object.entries(def.dialogues)){need(d.lines.length>0,`dialogues.${id}`,i18nText("core.story-schema.b5300d0d5a"));
    for(const [speaker,text] of d.lines)need(Object.hasOwn(def.actors,speaker)&&typeof text==='string',`dialogues.${id}`,i18nText("core.story-schema.2e6d8c922f"));actions(d.after,`dialogues.${id}.after`);
    const ids=new Set();for(const v of d.variants||[]){need(v.id&&v.id!=='base'&&!ids.has(v.id),id,i18nText("core.story-schema.cbd063f6e5"));ids.add(v.id);condition(v.when,id);
      if(v.line){need(Number.isInteger(v.replace)&&v.replace>=0&&v.replace<d.lines.length,id,i18nText("core.story-schema.d43ac2d7dc"));line(v.line,id);}
      for(const l of v.append||[])line(l,id);
    }}
  for(const [id,r] of Object.entries(def.routes)){r.sites.forEach(s=>site(s,`routes.${id}`));need(r.sites.length===r.counts.length,`routes.${id}`,i18nText("core.story-schema.2db4f81b6a"));
    r.counts.forEach(total=>{if(total!==0)wave({total,cap:r.cap,heavy:r.heavy},`routes.${id}`);});
    if(r.loadouts)r.loadouts.forEach(l=>need(def.loadouts.some(s=>s.id===l),id,i18nText("core.story-schema.57fe1875ab")));if(r.supply)need(def.flags.includes(r.supply.flag),`routes.${id}`,i18nText("core.story-schema.90e8d369d2"));}
  for(const [id,t] of Object.entries(def.targets)){site(t.site,`targets.${id}`);need(t.hp>0&&t.maxHp>=t.hp,`targets.${id}`,i18nText("core.story-schema.c97ce659a9"));}
  def.restoreTargets.forEach(id=>need(Object.hasOwn(def.targets,id),'restoreTargets',i18nText("core.story-schema.164c628953")));
  // 战斗圈与出生距离来自同一表，错误半径不得创建困住玩家的遭遇。
  function arenaRule(ring,path){need(ring&&ring.radius>180&&ring.terrain==='forest'&&ring.spawnInset>=24&&ring.spawnInset<ring.radius&&ring.playerDistance>0&&ring.playerDistance<ring.radius,path,i18nText("core.story-schema.c537987fd1"));}
  arenaRule(def.encounters.arena,'encounters.arena');
  need(Number.isInteger(def.encounters.wave.batch)&&def.encounters.wave.batch>0&&def.encounters.wave.batch<=8,'encounters.wave.batch','每批刷怪须为 1–8 只');
  for(const [id,b] of Object.entries(def.encounters.bosses)){site(b.site,`bosses.${id}`);need(b.support.total>0&&b.support.batch>0,`bosses.${id}`,i18nText("core.story-schema.9ca640cee0"));}
  for(const [id,n] of Object.entries(def.nodes)){
    const p=`nodes.${id}`;if(n.encounter?.arena)arenaRule(n.encounter.arena,p+'.encounter.arena');need(TASKS.has(n.task.type),p,i18nText("core.story-schema.bf918ae55d"));site(n.objective.site,p+'.objective');
    if(n.objective.action)need(Object.hasOwn(def.dialogues,n.objective.action),p,i18nText("core.story-schema.7236642135"));
    if(n.objective.actionWhen!==undefined)condition(n.objective.actionWhen,p);
    // 点击目标必须是当前站点实际出场的角色或物件，不能把箭头绑定到远处陪同者。
    if(n.interactionTarget){const t=n.interactionTarget;
      need(!!t.actor!==!!t.prop,p+'.interactionTarget','点击目标应选择一个人物或物件');
      const candidates=t.actor?n.actors||[]:[...(n.props||[]),...def.props];
      need(candidates.some(a=>a.site===n.objective.site&&(t.actor?a.actor===t.actor:a.kind===t.prop)),p+'.interactionTarget','点击目标必须在本站点出场');}
    if(n.prepareWhen!==undefined)condition(n.prepareWhen,p);if(n.claimWhen)condition(n.claimWhen,p);
    if(n.campReturn!==undefined)need(typeof n.campReturn==='boolean',p+'.campReturn','回营标记必须为布尔值');
    if(n.after)actions(n.after,p+'.after');
    if(n.choice)need(Array.isArray(def.choices?.[n.choice])&&def.choices[n.choice].length>0,p,i18nText("core.story-schema.6b6d5616af"));
    if(n.excursion){need(['rogue','guardian'].includes(n.excursion.mode)&&def.flags.includes(n.excursion.flag)&&n.excursion.completion==='enter',p,i18nText("core.story-schema.14f31d6eac"));actions(n.excursion.after,p);}
    if(['travel','landing'].includes(n.task.type)){need(n.task.radius>0,p,i18nText("core.story-schema.07688aa84b"));if(n.task.type==='travel'){need(n.task.points.length>0,p,i18nText("core.story-schema.c210d190c2"));n.task.points.forEach(s=>site(s,p));}else site(n.task.site,p);}
    if(n.care)need(['water','frost','shield'].includes(n.care),p+'.care','照料仅支持水流、冰晶和护盾检测');
    if(n.start)actions(n.start,p+'.start');if(n.task.after)actions(n.task.after,p+'.after');
    if(n.task.type==='wave'){site(n.task.site,p);wave(n.task.wave,p);}
    if(n.task.type==='route')site(n.task.destination,p);
    if(n.task.type==='defense'){site(n.task.site,p);need(n.task.waves.length>0,p,i18nText("core.story-schema.d2e2e473cf"));n.task.waves.forEach(w=>wave(w,p));}
    if(n.task.type==='boss')need(Object.hasOwn(def.encounters.bosses,n.task.boss),p,i18nText("core.story-schema.35f98301ec"));
    if(n.encounter?.batch!==undefined)need(Number.isInteger(n.encounter.batch)&&n.encounter.batch>0&&n.encounter.batch<=8,p+'.encounter.batch','每批刷怪须为 1–8 只');
    if(n.encounter?.interval!==undefined)need(n.encounter.interval>0,p,i18nText("core.story-schema.033a4528d1"));
    // 阶段血量覆盖只接受已有敌人类型与正数，避免生成无法击杀或出生即死的敌人。
    for(const [kind,hp] of Object.entries(n.encounter?.enemyHp||{}))need(Object.hasOwn(def.encounters.enemies,kind)&&Number.isFinite(hp)&&hp>0,p+'.encounter.enemyHp','敌人生命必须是已有类型的正数');
    if(n.experience)need(n.experience==='loadout'||Object.hasOwn(def.journey.experiences,n.experience),p,i18nText("core.story-schema.2b5cbc1ef3"));
    for(const c of n.cues||[]){need(c.id&&!cueIds.has(c.id),p,i18nText("core.story-schema.ec1f0a01e4"));cueIds.add(c.id);need(events.has(c.event),p,i18nText("core.story-schema.ad4834b317"));
      match(c.match,p);speech(c,p);if(c.when!==undefined)condition(c.when,p);}
    for(const [loadout,f] of Object.entries(n.encounter?.formations||{})){
      need(def.loadouts.some(l=>l.id===loadout),p,i18nText("core.story-schema.d6a8dfc138"));need(Array.isArray(f.lanes)&&f.lanes.length>0&&f.lanes.every(a=>Array.isArray(a)&&a.length>0&&a.every(Number.isFinite)),p,i18nText("core.story-schema.3f11a8105a"));}
    if(n.target)need(Object.hasOwn(def.targets,n.target),p,i18nText("core.story-schema.164c628953"));
    if(n.panel)need(['route','loadout','claim','choice','excursion'].includes(n.panel.type),p,i18nText("core.story-schema.5747fe3921"));
    for(const a of n.actors||[]){need(def.actors[a.actor]?.source==='actor',p,i18nText("core.story-schema.e4a035606f"));site(a.site,p);if(a.when!==undefined)condition(a.when,p);}
    (n.props||[]).forEach(x=>prop(x,p));
  }
  def.props.forEach(p=>prop(p,'props'));site(def.trial.site,'trial');
  need(def.cleanup.scene.lifetime==='session','cleanup.scene',i18nText("core.story-schema.d121c15d85"));
  for(const [id,c] of Object.entries(def.cleanup)){for(const key of [...(c.arrays||[]),...(c.nulls||[]),...(c.playerDelete||[]),...(c.clear||[])])pathKey(key,'cleanup.'+id);
    for(const flag of c.flags||[])need(def.flags.includes(flag),'cleanup.'+id,i18nText("core.story-schema.d41f9e34b5"));}
  return def;
}
