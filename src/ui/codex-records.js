// 图鉴统计文案与资料内容集中生成，页面交互仍由统一图鉴管理。
import {codexRecord,codexTotals} from '../progression/player/world-codex.js';
// 列表用短标签显示累计数量；库存不会被误称为历史。
export function codexRecordLabel(p,e){
 const r=codexRecord(p,e);
 if(e.category==='fish')return '钓获 '+r.count+' 条';
 if(e.category==='monster')return '击败 '+r.kills+' 次';
 if(e.category==='crop')return (r.owned?'已发现':'未发现')+' · 收获 '+r.harvested+' 次';
 return (r.owned?'已拥有':'未拥有')+' · 击杀 '+r.kills+' 次';
}
// 总览同时显示战斗、收集和种田记录，提醒旧档无法还原的分类明细。
export function codexOverview(p){
 const t=codexTotals(p),labels={kills:'击败怪物与领主',trees:'伐倒树木',fish:'累计入护鱼获',fishKinds:'收集鱼种',planted:'播种次数',harvested:'收获次数',watered:'作物浇水次数',dug:'开垦次数',weapons:'已拥有武器装备',vehicles:'已拥有载具'};
 return '<section class="ui-section"><h3>探索档案</h3><dl class="codex-stat-grid">'+Object.entries(labels).map(([k,label])=>'<div class="ui-inset"><dt>'+label+'</dt><dd>'+t[k]+'</dd></div>').join('')+'</dl><p class="codex-summary">钓获按成功收进鱼护的条数累计，出售不会减少历史。击杀按最后一次致命攻击归属统计，同一只怪不会重复计数。</p>'+codexHistoryNote(p)+'</section>';
}
// 全局总数与分类记录可能从不同版本开始，不把差额强行分给某个品种。
export function codexHistoryNote(p){return p.statistics.codex?.partial||p.statistics.partial||p.statistics.equipment?.partial?'<p class="codex-summary">旧存档的部分分类明细从本次更新起记录；已有总数和装备、鱼获历史保留，无法追溯的次数不会估算补写。</p>':'';}
// 新增三类详情沿用相同画布、内容分区与正式基础配置。
export function worldCodexDetail(p,e){
 const r=codexRecord(p,e);let content;
 if(e.category==='crop')content='<p>'+e.group+' · '+(r.owned?'已发现':'尚未发现')+'</p><h4>种植与用途</h4><p>生长 '+e.seconds+' 秒 · 每份售价 '+e.value+' 金币 · 收获经验 '+e.xp+'</p><p>从种子小屋购买已解锁种子，在开垦的土地播种；收获可出售；配方所需品种还可用于农矿加工。</p><h4>累计记录</h4><p>播种 '+r.planted+' 次 · 收获 '+r.harvested+' 次 · 种子库存 '+r.seeds+' 粒</p>';
 else {content='<p>'+e.group+' · '+(r.owned?'已拥有':'尚未拥有')+'</p><h4>基础介绍</h4><p>'+e.description+'</p><h4>基础属性</h4><p>'+(e.category==='vehicle'?'基础生命 '+e.baseHp+' · 移速系数 '+e.speed:e.attackKind==='defense'?'防护型装备，具体效果见介绍。':'基础伤害 '+(e.damage||0)+' · 攻击间隔 '+(e.interval||0)+' 秒 · 射程 '+(e.range||0))+'</p><h4>累计战绩</h4><p>击杀 '+r.kills+' 次 · 伐倒树木 '+r.trees+' 棵</p><p>记录使用此'+(e.category==='vehicle'?'载具':'装备')+'完成的致命攻击；切换装备和读档不会清除历史。</p>';}
 return '<section class="ui-section codex-detail"><canvas width="192" height="160" data-creature="'+e.key+'" role="img" aria-label="'+e.name+'外观"></canvas><h3>'+e.name+'</h3>'+content+codexHistoryNote(p)+'</section>';
}
