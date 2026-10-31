// 旧菜单与追踪入口统一路由，秘境继续使用原局内装备面板。

// 监听器交由外层事件作用域销毁，避免重新挂载后重复触发。
export function bindWorkshopEntrypoints({root,scope,game,open}) {
  // 捕获旧入口，保持原秘境车库流程；森林中只有一个正式工坊。
  scope.on(root, 'click', event => {
    if (game.realm) return;
    const target = event.target.closest('#weapons-button, #vehicles-button, #tab-weapons, #goal-workshop, [data-category="vehicles"]');
    if (!target) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (target.id === 'goal-workshop') {
      const goal = game.progress.equipmentGoal;
      open(goal?.kind === 'weapons' || !goal ? 'weapons' : 'vehicle',
        goal?.kind === 'turret' ? game.progress.vehicleIndex : goal?.index, goal?.kind === 'turret' ? goal.index : undefined);
    } else open(target.id === 'vehicles-button' || target.dataset.category === 'vehicles' ? 'vehicle' : 'weapons');
  }, true);
  // 原营地页签的左右键也转入统一工坊，不能留下可绕过试装的旧武器页。
  scope.on(root, 'keydown', event => {
    if (!game.realm && event.target.closest('[data-tab]') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation(); open('weapons');
    }
  }, true);
}
