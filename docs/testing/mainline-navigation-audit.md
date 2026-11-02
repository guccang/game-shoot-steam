# 主线导航失败排查记录

日期：2026-11-02。基线：9e2cdcd。

## 三项失败的原因

| 测试 | 原因 | 修复方式 |
| --- | --- | --- |
| 全任务步骤导航 | 将内容表的 navigation 当成所有现场状态的最终目标。收获任务没有田块时应就近开田，有田时选实际田块；继续遍历还暴露了空货舱先去仓库取物的相同预期问题。 | 分别断言固定入口、无田开垦、空舱取货；新增成熟自种田、野田重选、带货回仓、空田播种及真实停车位置场景。 |
| 长线整备切换工坊 | 仅设置 completed，未主动选择 long-patrol。主线与自选体验拆分后，默认选择器正确返回下一章战役，因此实际测的是故事入口。 | 使用正式 selectMainlineTask 选择自选体验，先断言当前任务身份，再检查四个步骤和交付。 |
| 角色升级与驾驶 | 同样缺少当前任务选择，误将下一章故事动作与角色入口比较。 | 正式选择 pistol-upgrade，再正式切换 first-vehicle，检查随身操作不铺路。 |

本次未发现上述场景的实际导航实现错误，不修改运行代码。测试不以被测函数返回值直接充当预期：固定入口对照配置实体，动态目标对照已知田块、车辆停车记录或 NPC 实际坐标。逐段用正式玩家碰撞检查路线，保留森林树木、建筑和正式分帧寻路。

## 验证

```powershell
node --test tests/mainline-navigation-audit.test.mjs tests/exploration-pacing.test.mjs tests/camp-daily-life.test.mjs
```

102 项通过，0 失败、0 跳过；其中导航遍历覆盖全部 48 个任务的 78 个步骤。每个步骤是独立子测试，单项失败不再阻止后续任务接受检查。另覆盖收空田后重选、货舱取货/停车处/交付切换和移动伙伴交付导航。

浏览器使用本 worktree 的 4175 服务运行 `tests/navigation-audit-browser.cjs`。在 390×844 手机容器里真正打开巡林簿、点击三个自选任务、关闭后核对 HUD 与插值画面目标：

- long-patrol → garageEntry，正式路线可达。
- pistol-upgrade 的角色升级步骤 → 无地面导航；实际点击 HUD 打开当前猫猫详情。
- upgrade-harvest → 现场生成的 harvest-plot-50，正式路线可达。

浏览器无 pageerror。截图保留在主仓库 `output/playwright/navigation-audit/`。本次为测试修复与回归补充，无界面或美术变更，不涉及旧存档迁移。
