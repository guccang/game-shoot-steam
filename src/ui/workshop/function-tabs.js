import {WEAPONS} from '../../config/weapons.js';
// 工坊功能分区只管理展示和导航，所有费用与资格仍读取正式规则。

export const WORKSHOP_FUNCTIONS=['buy','upgrade','modify','unlock'];

// 统一页签语义与独立功能内容，隐藏项不会留在键盘焦点顺序中。
export function renderWorkshopFunctions(root,{page,kind,index,progress,owned,unarmed,empty=false}){
 const defense=kind==='weapons'&&WEAPONS[index]?.attackKind==='defense';
 const $=id=>root.getElementById(id),dialog=$('workshop-dialog');
 dialog.dataset.function=page;
 for(const button of dialog.querySelectorAll('[data-ws-function]')){
  const selected=button.dataset.wsFunction===page;
  button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
 }
 $('ws-function-upgrade').textContent=kind==='vehicle'?'装配':'升级';
 $('ws-go-upgrade').textContent=kind==='vehicle'?'前往装配':'前往升级';
 $('ws-function-modify').textContent='改装';
 $('ws-function-modify').hidden=kind==='vehicle'||defense;
 $('ws-function-modify').disabled=kind==='vehicle'||defense;
 $('ws-function-panel').setAttribute('aria-labelledby','ws-function-'+page);
 $('ws-unlock-panel').hidden=page!=='unlock';
 dialog.querySelector('.ws-parts').hidden=empty||!['upgrade','modify'].includes(page)||page==='modify'&&unarmed;
 if(empty)return;
 $('ws-purchase').hidden=page!=='buy'||owned;
 $('ws-go-upgrade').hidden=page!=='buy'||!owned;
 $('ws-go-buy').hidden=!['upgrade','modify'].includes(page)||owned;
 $('ws-unlock-link').hidden=true;
 $('ws-socket').hidden=!['upgrade','modify'].includes(page)||page==='modify'&&unarmed;
 $('ws-hint').hidden=page==='buy'||page==='unlock';
 $('ws-empty-modify').hidden=page!=='modify'||!unarmed;
 // 成长只解释当前装备的熟练度；购买优惠继续由正式报价计算。
 $('ws-unlock-panel').setAttribute('aria-label',kind==='vehicle'?'战车成长说明':'武器熟练度成长');
 $('ws-unlock-status').textContent=kind==='weapons'?'使用这把武器击败怪物，积累熟练度。':'主炮可跨车型换装，安装只受载重限制。';
 if(defense){$('ws-unlock-status').textContent='手持护盾自动抵挡伤害，载具主炮继续攻击。';$('ws-unlock-rule').textContent='升级护盾核心和充能线圈，无熟练度要求。';return;}
 $('ws-unlock-rule').textContent=kind==='vehicle'?'换装发动机提升运力；叠加装甲增加耐久和重量。主武器部件可独立升级。':'基础部件可直接升级；熟练度达到 2 级后解锁改装套件。';
}
