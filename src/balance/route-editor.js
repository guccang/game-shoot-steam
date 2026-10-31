import { i18nText } from "../i18n/index.js";
// 中文购买路线编辑器：只管理选择与顺序，报价、资格和购买仍交给共享模拟规则。
import { WEAPONS } from '../config/weapons.js';
import { COLLECTED_VEHICLES } from '../config/vehicles.js';

const CATEGORIES = {weapons:{name:i18nText("balance.app.ea92132bc9"),items:WEAPONS},vehicle:{name:i18nText("balance.route-editor.a7b0282814"),items:COLLECTED_VEHICLES}};
const MAX_TARGETS=30;

// 使用原生选择框和按钮创建可键盘操作的列表，内部保留原有稳定装备编号。
export function createRouteEditor(root,initial,onChange) {
  const doc=root.ownerDocument;
  let route=initial.map(row=>[...row]);
  // 文字使用textContent，目录名称不会作为HTML执行。
  function element(tag,className,text) {
    const node=doc.createElement(tag);if(className)node.className=className;
    if(text!==undefined)node.textContent=text;return node;
  }
  const list=element('ol','purchase-route'),empty=element('p','hint',i18nText("balance.route-editor.ead2f741b1"));
  const add=element('button','route-add',i18nText("balance.route-editor.db91a31eff")),message=element('p','hint route-message');
  add.type='button';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  root.replaceChildren(list,empty,add,message);
  // 返回新数组，避免模拟或报告意外修改正在编辑的路线。
  function read() {
    if(!route.length)throw Error(i18nText("balance.route-editor.60b71a62c8"));
    return route.map(row=>[...row]);
  }
  // 每次结构变化后重排显示序号，键盘焦点跟随移动或相邻项目。
  function render(focusIndex=null,focusPart='item') {
    list.replaceChildren();empty.hidden=route.length>0;add.disabled=route.length>=MAX_TARGETS;
    add.textContent=add.disabled?i18nText("balance.route-editor.01b2972a70"):i18nText("balance.route-editor.db91a31eff");
    route.forEach(([kind,index],position)=>{
      const row=element('li','route-row');
      row.append(element('strong','route-position',i18nText("balance.route-editor.d7c96a8a27", { p0: (position+1) })));
      // 标签关联当前行控件，中文可访问名称同时包含购买顺序。
      function selectField(part,title,options,value) {
        const label=element('label','',title),select=element('select','route-'+part);
        select.id='route-'+position+'-'+part;label.htmlFor=select.id;
        select.setAttribute('aria-label',i18nText("balance.route-editor.59d6c9ad11", { p0: (position+1), p1: (title) }));
        for(const [key,name] of options){const option=element('option','',name);option.value=key;select.append(option);}
        select.value=String(value);label.append(select);row.append(label);return select;
      }
      const category=selectField('kind',i18nText("balance.route-editor.74cb41215c"),Object.entries(CATEGORIES).map(([key,c])=>[key,c.name]),kind);
      const item=selectField('item',i18nText("balance.route-editor.40717d9865"),CATEGORIES[kind].items.map((entry,i)=>[i,entry.name]),index);
      category.onchange=()=>{
        route[position]=[category.value,0];render(position,'kind');changed(i18nText("balance.route-editor.68bf04693e", { p0: (position+1) }));
      };
      item.onchange=()=>{
        const selected=Number(item.value);route[position][1]=selected;render(position);
        changed(i18nText("balance.route-editor.db99f21980", { p0: (position+1), p1: (CATEGORIES[kind].items[selected].name) }));
      };
      const actions=element('div','route-actions');
      // 首末项目禁用越界移动；移动、删除后仍可继续使用键盘操作。
      for(const [action,title,disabled] of [['up',i18nText("balance.route-editor.f853a70b12"),position===0],['down',i18nText("balance.route-editor.e75e8b4e5c"),position===route.length-1],['remove',i18nText("balance.route-editor.2f9daa8289"),false]]){
        const button=element('button','route-'+action,title);button.type='button';button.disabled=disabled;
        button.setAttribute('aria-label',i18nText("balance.route-editor.d0a2ce0668", { p0: (title), p1: (position+1), p2: (CATEGORIES[kind].items[index].name) }));
        button.onclick=()=>{
          if(action==='remove'){
            route.splice(position,1);render(Math.min(position,route.length-1));changed(i18nText("balance.route-editor.02dccd87e5", { p0: (position+1) }));
          }else{
            const next=position+(action==='up'?-1:1);
            [route[position],route[next]]=[route[next],route[position]];
            render(next,action);changed(i18nText("balance.route-editor.45346bfc0d", { p0: (next+1) }));
          }
        };
        actions.append(button);
      }
      row.append(actions);list.append(row);
    });
    if(focusIndex!==null){
      const row=list.children[focusIndex],target=row?.querySelector('.route-'+focusPart);
      (target&&!target.disabled?target:row?.querySelector('.route-item')||add).focus();
    }
  }
  // 调整后明确提示需要重新运行，防止把旧报告误认为新路线的结果。
  function changed(text) {message.textContent=i18nText("balance.route-editor.ea3ab8545a", { p0: (text) });onChange?.();}
  add.onclick=()=>{
    if(route.length>=MAX_TARGETS)return;
    const index=WEAPONS.findIndex((_,i)=>!route.some(([kind,n])=>kind==='weapons'&&n===i));
    route.push(['weapons',Math.max(0,index)]);render(route.length-1);changed(i18nText("balance.route-editor.9b009865fc", { p0: (route.length) }));
  };
  render();return {read};
}
