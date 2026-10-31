import { HELP_EMBLEM } from '../help-emblem.js';
import { i18nHtml } from "../../i18n/index.js";
// 独立武器与载具工坊共用的静态结构：真实装备占据工作台中央，资源结算固定在底部。
export const WORKSHOP_MARKUP = `
  <header class="ws-header"><div><small>${i18nHtml("ui.workshop.markup.da63b4a7d5")}</small><h2 id="workshop-title">${i18nHtml("ui.workshop.markup.0a0eb57124")}</h2></div>

    <button id="ws-close" aria-label="${i18nHtml("ui.workshop.markup.214048f1a8")}">×</button></header>
  <nav class="ws-function-tabs" role="tablist" aria-label="工坊功能">
    <button id="ws-function-buy" role="tab" data-ws-function="buy" aria-controls="ws-function-panel">购买</button>
    <button id="ws-function-upgrade" role="tab" data-ws-function="upgrade" aria-controls="ws-function-panel">升级</button>
    <button id="ws-function-modify" role="tab" data-ws-function="modify" aria-controls="ws-function-panel">改装</button>
    <button id="ws-function-unlock" role="tab" data-ws-function="unlock" aria-controls="ws-function-panel">成长</button>
  </nav>
  <div class="ws-layout" id="ws-function-panel" role="tabpanel" tabindex="0">
    <aside class="ws-rack"><h3 id="ws-rack-title">${i18nHtml("ui.workshop.markup.68cbef9d6a")}</h3><div id="ws-shelf" aria-label="${i18nHtml("ui.workshop.markup.ed9f57b014")}"></div></aside>
    <!-- 货架为空时隐藏旧工作台与结算按钮，保留页签和清楚的下一步入口。 -->
    <section id="ws-empty-catalog" class="ui-section" hidden role="status"><h3 id="ws-empty-title"></h3><p id="ws-empty-text"></p><button id="ws-empty-action" type="button" class="ui-button"></button></section>
    <section class="ws-center">
      <div class="ws-title"><div><small id="ws-state"></small><h3 id="ws-name"></h3></div><button id="ws-info" type="button" aria-label="查看装备档案" aria-haspopup="dialog" aria-controls="ws-equipment-dialog">${HELP_EMBLEM}</button><span id="ws-level"></span></div>
      <section id="ws-unlock-panel" hidden aria-label="武器熟练度成长">
        <h3>武器熟练度</h3><p id="ws-unlock-status"></p>
      <!-- 熟练度沿文档流占位，不遮挡装备和属性；长说明由问号打开。 -->
      <section id="ws-mastery" aria-label="熟练度与改装门槛">
        <div class="ws-mastery-top"><b id="ws-mastery-title"></b><span id="ws-mastery-count"></span><button id="ws-mastery-help" type="button" aria-label="如何提升熟练度" aria-haspopup="dialog">${HELP_EMBLEM}</button></div>
        <progress id="ws-mastery-progress" aria-label="熟练度经验进度" max="1" value="0"></progress>
        <small id="ws-mastery-hint"></small>
      </section>
        <p id="ws-unlock-rule"></p>
      </section>
      <p id="ws-vehicle-parking" class="ws-vehicle-parking" hidden></p>
      <p id="ws-empty-modify" hidden>沿用角色手持武器，无独立挂载位。</p>
      <div class="ws-bench" id="ws-bench">
        <!-- 试射与驾驶/装备共用舞台右上角入口，沿用原按钮状态和事件。 -->
        <div class="ws-stage-actions"><button id="ws-test" aria-haspopup="dialog" aria-controls="weapon-trial-dialog">进入演练场</button><button id="ws-equip">${i18nHtml("ui.workshop.markup.144a327039")}</button></div>
        <span class="ws-stage-label" id="ws-stage-label">${i18nHtml("ui.workshop.markup.283a7f514f")}</span>
        <canvas id="ws-stage" width="660" height="400" aria-label="${i18nHtml("ui.workshop.markup.3ceb64a6d6")}"></canvas>
        <canvas id="ws-construction" width="660" height="400" aria-hidden="true"></canvas>
        <button id="ws-socket" aria-label="${i18nHtml("ui.workshop.markup.60d5f8efa2")}"><span>＋</span></button>
        <button id="ws-before" aria-label="${i18nHtml("ui.workshop.markup.6d2ff34613")}"><canvas id="ws-original" width="180" height="120"></canvas><span>${i18nHtml("ui.workshop.markup.93781bc574")}</span></button>
        <span class="ws-hint" id="ws-hint">${i18nHtml("ui.workshop.markup.2b9b384574")}</span>
      </div>
      <div id="ws-result" hidden role="status" aria-live="polite" aria-label="${i18nHtml("ui.workshop.markup.326fdf1da6")}">
        <div class="ws-result-heading"><b id="ws-result-name"></b><span id="ws-result-level"></span></div>
        <div id="ws-result-fields"></div>
      </div>
      <div class="ws-controls"><button id="ws-change-part" type="button" hidden>更换部件</button>
      <div id="ws-part-compare" hidden aria-label="${i18nHtml("ui.workshop.markup.f665610a1c")}">
        <button id="ws-part-before" aria-pressed="false"><canvas width="120" height="72" aria-hidden="true"></canvas><span>${i18nHtml("ui.workshop.markup.59b27f680b")}</span></button>
        <span aria-hidden="true">→</span>
        <button id="ws-part-after" aria-pressed="true"><canvas width="120" height="72" aria-hidden="true"></canvas><span>${i18nHtml("ui.workshop.markup.3d7e0e5966")}</span></button>
      </div>
      <div class="ws-tools"><button id="ws-reset">${i18nHtml("ui.inventory.a633ee3abb")}</button><button id="ws-mechanical" data-mechanical-config hidden>${i18nHtml("ui.panels.mechanical.0238a8a5dd")}</button><button id="ws-spider" data-spider-config hidden>${i18nHtml("ui.panels.spider.7cc04ea64d")}</button><button id="ws-funnel" hidden>${i18nHtml("ui.workshop.markup.2f0bc1beab")}</button></div>
      </div>
      <div id="ws-construction-tools" hidden><button id="ws-tool" aria-pressed="false"><canvas id="ws-tool-icon" width="64" height="52" aria-hidden="true"></canvas></button><span id="ws-work-progress">${i18nHtml("ui.workshop.construction.fe61bd3677")}</span><button id="ws-hold" disabled aria-label="${i18nHtml("ui.workshop.markup.1ed8ec7117")}" aria-pressed="false" aria-describedby="ws-work-progress">${i18nHtml("ui.workshop.markup.97425ee342")}</button></div>
      <!-- 载具当前属性与特性共用信息区，词条最多三条，不展示空占位。 -->
      <section id="ws-attributes" aria-label="装备属性">
        <small id="ws-stats-title"></small><div id="ws-stats" aria-label="${i18nHtml("ui.workshop.markup.8cdb073448")}"></div>
        <div id="ws-vehicle-traits" hidden><small>载具特性</small><ul id="ws-trait-list"></ul></div>
      </section>
    </section>
    <aside class="ws-parts"><div class="ws-tray-tabs"><button id="ws-components-tab">${i18nHtml("balance.app.a2345efc60")}</button><button id="ws-kits-tab">${i18nHtml("ui.workshop.markup.58be5abb3c")}</button><button id="ws-native-turret" type="button" hidden>专属主炮</button><button id="ws-back-body" hidden>${i18nHtml("balance.app.4d4acd9679")}</button></div><div id="ws-components" aria-label="${i18nHtml("ui.workshop.markup.05f45ca07e")}"></div><h3 id="ws-parts-title">${i18nHtml("ui.workshop.markup.b1135c61fb")}</h3><div id="ws-parts" aria-label="${i18nHtml("ui.workshop.markup.e8e21f5919")}"></div>
      <!-- 挂载分页避免把整套炮塔目录挤进手机工作台。 -->
      <div id="ws-mount-pages" hidden><button id="ws-mount-prev" type="button" aria-label="上一页挂载武器">‹</button><span id="ws-mount-page"></span><button id="ws-mount-next" type="button" aria-label="下一页挂载武器">›</button></div>
      <div id="ws-part-info"></div><button id="ws-turret-buy" hidden>${i18nHtml("ui.inventory.99be99bf93")}</button><button id="ws-turret-upgrade" hidden>${i18nHtml("ui.workshop.markup.563c6c972e")}</button></aside>
  </div>
  <footer class="ws-footer"><div class="ws-quote"><div id="ws-purpose" aria-live="polite"></div><div id="ws-upgrade-preview" hidden aria-label="升级属性变化"></div><small id="ws-cost-title"></small><div id="ws-resources" aria-label="${i18nHtml("ui.workshop.markup.f44a742229")}"></div></div><button id="ws-story-condition" type="button" hidden></button><div class="ws-checkout">
    <span id="ws-feedback" role="status" aria-live="polite"></span><div><button id="ws-unlock-link" type="button">成长说明</button><button id="ws-go-upgrade" type="button" hidden>升级部件</button><button id="ws-go-buy" type="button" hidden>前往购买</button><button id="ws-track" hidden>${i18nHtml("ui.workshop.markup.40d8f1554f")}</button><button id="ws-purchase">${i18nHtml("balance.app.cc6f86bd41")}</button><button id="ws-confirm" class="primary" disabled>${i18nHtml("ui.workshop.markup.40e7d0db20")}</button></div></div></footer>
`;
