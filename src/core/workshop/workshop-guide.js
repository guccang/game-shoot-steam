// 工坊操作阶段解释器：只给出真实控件目标，所有交易仍走原工坊提交。
export function workshopGuideCue(operation,state){
 const cue=(id,source,text,target=null)=>({id,source,text,target});
 if(!operation||!state.open)return null;
 if(state.dragging||state.tool.pointer)return {id:'dragging',preserve:true};
 if(state.kind!==operation.kind)return cue('wrong-kind','#ws-close','返回，打开当前任务的工坊');
 // 先切换拥有状态对应的页签，再找货架；已拥有武器不再出现在购买页。
 const equipmentAction=['equip','drive','trial','controller'].includes(operation.type);
 const page=operation.type==='trial'&&typeof operation.owned==='boolean'?(operation.owned?'upgrade':'buy'):operation.type==='upgrade'?'upgrade':operation.type==='modify'?'modify':['buy','track'].includes(operation.type)?'buy':equipmentAction&&['buy','unlock'].includes(state.page)?'upgrade':null;
 if(state.page&&page&&state.page!==page)return cue('function','#ws-function-'+page,page==='upgrade'?'打开部件升级':page==='modify'?(state.kind==='vehicle'?'打开武器挂载':'打开改装套件'):'打开装备购买');
 if(state.empty)return cue('empty','#ws-empty-action',state.page==='buy'?'查看已拥有的装备':'先购买装备');
 const accepted=operation.indices||[operation.index];
 if(!accepted.includes(state.index))return cue('equipment',`[data-ws-item="${operation.index}"]`,'选择任务装备');
 if(state.trial)return cue('trial','#weapon-trial-close','演练结束后点这里返回');
 if(operation.type!=='upgrade'){
  if(operation.type==='modify'&&['modify','mount'].includes(state.draft?.action)){
   if(state.before)return cue('after','#ws-before','切回试装方案继续安装');
   if(!state.affordable)return cue('resources','#ws-feedback',state.reason||'当前方案暂不可安装');
   return cue('hold','#ws-hold',state.kind==='vehicle'?'长按确认挂载，松手暂停':'长按确认改装，松手暂停');
  }
  if(state.draft)return cue('draft','#ws-change-part','更换方案，返回当前操作');
  if(operation.type==='modify'){
   if(state.tray!=='kits')return cue('kits','#ws-kits-tab','打开改装套件');
   return state.kind==='vehicle'?cue('kit',`[data-ws-part]:not([data-ws-part="${state.weaponTarget}"])`,'点选武器，自动试装'):cue('kit','[data-ws-part="1"]','点选套件，自动试装');
  }
  const buttons={buy:['#ws-purchase','购买这件装备'],track:['#ws-track','追踪这件装备'],equip:['#ws-equip','装备这把武器'],drive:['#ws-equip','选择战车并上车'],trial:['#ws-test','进入演练场，击毁靶子'],controller:['#ws-equip','先装备控制器']};
  const entry=buttons[operation.type];return entry?cue(operation.type,...entry):null;
 }
 if(state.draft&&(state.draft.part!==operation.part||operation.native&&state.turret!==operation.turret||!operation.native&&state.turret!==null))return cue('other-draft','#ws-change-part','更换部件，继续当前任务');
 // 完成摘要取代部件托盘时，先回到目录，连续任务才能找到下一部件。
 if(state.completed)return cue('continue','#ws-change-part','继续升级下一个部件');
 if(operation.native&&state.turret!==operation.turret)return cue('native',state.weaponTarget===operation.turret?'#ws-kits-tab':'#ws-native-turret','选择专属主炮部件');
 if(!operation.native&&(state.turret!==null||state.tray!=='components'))return cue('components','#ws-components-tab','打开车体部件');
 if(state.before)return cue('after','#ws-part-after','切回新部件继续安装');
 if(!state.affordable)return {...cue('resources','#ws-resources','材料不足，先补齐标红的缺口'),...(!state.draft?{prepare:operation.part}:{})};
 if(state.busy)return cue('assembly','#ws-stage','部件正在就位');
 if(state.draft)return cue('hold','#ws-hold','长按确认升级，松手暂停');
 return cue('part',`[data-ws-upgrade="${operation.part}"]`,'点选部件，自动试装');
}
