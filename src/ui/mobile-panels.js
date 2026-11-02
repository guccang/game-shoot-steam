// 旧页面显式接入手机框架：只搬移原节点，保留ID、事件委托与业务渲染区域。
export const MOBILE_PANEL_CONTRACTS = {
  'camp-dialog':{header:'.camp-title',body:'.camp',close:'#close-camp',footer:['#camp-done']},
  'vehicle-collection-dialog':{close:'#close-vehicle-collection',subtitle:'#vehicle-collection-count',footer:['#vehicle-collection-done']},
  'map-dialog':{close:'#close-map',footer:['#map-done']},
  'environment-dialog':{close:'#close-environment',footer:['#environment-ok']},
  'chronicle-dialog':{header:'.chronicle-heading',body:'.chronicle-scroll',close:'#close-chronicle',footer:['#chronicle-ok']},
  'realm-dialog':{header:'.realm-heading',body:'#realm-content',close:'#close-realm'},
  'mainline-dialog':{header:'header',close:'#mainline-close',footer:['.mainline-book-actions']},
  'funnel-dialog':{close:'#close-funnel',footer:['#funnel-done']},
  'mechanical-dialog':{close:'#close-mechanical',footer:['#mechanical-done']},
  'spider-dialog':{close:'#close-spider',footer:['#spider-done']},
  'living-dialog':{header:'header',body:'#living-content',close:'#living-close'},
  'camp-defense-dialog':{header:'header',close:'#camp-close',footer:['#camp-leave','#camp-primary']},
  'fire-dialog':{header:'.fire-dialog-head',body:'#fire-content',close:'.fire-dialog-head [data-fire-close]'},
  'arrival-workshop-dialog':{header:'header',close:'#arrival-workshop-close',footer:['#arrival-workshop-action']},
  'equipment-goal-dialog':{close:'#close-goal',footer:['#goal-workshop']},
  'help-dialog':{kind:'sheet',close:'#close-help',footer:['#help-ok']},
  'realm-help-dialog':{kind:'sheet',close:'#close-realm-help',footer:['#realm-help-done']},
  'resource-help-dialog':{kind:'sheet',close:'#close-resource-help'},
  'wave-help-dialog':{kind:'sheet',header:'header',close:'#wave-help-close'},
  'ws-mastery-dialog':{kind:'sheet',header:'header',close:'#ws-mastery-help-close',footer:['#ws-mastery-help-done']},
  'legendary-dialog':{header:'header',body:'#legendary-content',close:'#legendary-close',footer:['#legendary-status','#legendary-primary']},
  'ws-equipment-dialog':{kind:'sheet',header:'header',body:'.ws-equipment-copy',close:'#ws-equipment-close',footer:['#ws-legendary','#ws-equipment-done']},
  'challenge-catalog-dialog':{kind:'sheet',header:'header',close:'#challenge-catalog-close'},
  'workshop-dialog':{kind:'workshop',header:'.ws-header',body:'.ws-layout',close:'#ws-close',footer:['.ws-footer']},
};

// 每个原生页只组装一次，动态列表仍在原业务节点内刷新，无观察器或逐帧DOM搬运。
export function prepareMobilePanel(dialog) {
  const spec=MOBILE_PANEL_CONTRACTS[dialog.id];
  if(!spec||dialog.dataset.mobilePanel)return;
  const root=dialog.ownerDocument,kind=spec.kind||'page';
  const close=spec.close?dialog.querySelector(spec.close):null;
  let header=spec.header?dialog.querySelector(spec.header):null;
  let body=spec.body?dialog.querySelector(spec.body):null;
  const actions=(spec.footer||[]).map(selector=>dialog.querySelector(selector)).filter(Boolean);
  if(!header){
    header=root.createElement('header');const heading=root.createElement('div');
    const title=dialog.querySelector('h2'),subtitle=dialog.querySelector(spec.subtitle||':scope > .eyebrow,:scope > small');
    if(subtitle)heading.append(subtitle);if(title)heading.append(title);header.append(heading);
  }
  header.classList.add('ui-panel__header');
  if(close){close.classList.add('ui-close');header.append(close);}
  let footer=null;
  if(actions.length){
    footer=kind==='workshop'?actions[0]:root.createElement('footer');
    footer.classList.add('ui-panel__footer');
    if(kind!=='workshop')footer.append(...actions);
  }
  if(!body){
    body=root.createElement('div');
    for(const node of [...dialog.childNodes])if(node!==header&&node!==footer)body.append(node);
  }
  body.classList.add('ui-panel__body');
  dialog.prepend(header);
  if(kind!=='workshop')header.after(body);
  if(footer)dialog.append(footer);
  dialog.classList.add('ui-panel','ui-page','ui-migrated');
  dialog.dataset.mobilePanel=kind;
  if(kind==='sheet'||kind==='confirm')dialog.classList.add('ui-sheet');
  if(kind==='confirm')dialog.classList.add('ui-panel--compact');
  const title=header.querySelector('h2');
  if(title&&!dialog.hasAttribute('aria-labelledby')){
    title.id ||= dialog.id+'-title';dialog.setAttribute('aria-labelledby',title.id);
  }
}

// 动态玩法保留事件委托容器，将当前阶段的直接操作移到底栏；重绘后重新组装。
export function layoutMobileActions(container) {
  const actions=[...container.children].filter(node=>node.matches('button'));
  container.classList.toggle('ui-dynamic-body',actions.length>0);
  if(!actions.length)return;
  const root=container.ownerDocument,scroll=root.createElement('div'),footer=root.createElement('footer');
  scroll.className='ui-scroll-content';footer.className='ui-panel__footer';
  for(const node of [...container.childNodes])if(!actions.includes(node))scroll.append(node);
  footer.append(...actions);container.append(scroll,footer);
}
