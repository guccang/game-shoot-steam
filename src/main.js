// 页面入口只负责装配，规则、界面和浏览器服务均在独立模块中。
import {finishTitleStart} from './platform/title-start.js';
import {playerStorage} from './platform/player-profile.js';
import chinese from './i18n/locales/zh-CN.json' with { type: 'json' };
// 语言包错误必须可见，禁止带着残缺文案继续初始化游戏。
async function startApplication() {
  // 语言包本身无法加载时，仅启动错误使用基准表，游戏保持禁用。
  let startupMessage = chinese['startup.failed'];
  try {
    const { i18nText } = await import('./i18n/index.js');
    startupMessage = i18nText('startup.failed');
    // 错误的玩法表必须在建立战场前失败，不能带着缺失或非法数值进入战斗。
    const { validateGameplayConfig } = await import('./config/gameplay-validation.js');
    validateGameplayConfig();
    // 内容表在建立战场前核验任务引用与成长规则，避免错误配置进入玩家存档。
    const { validateContentConfig } = await import('./config/content-validation.js');
    validateContentConfig();
    const { loadGameFont } = await import('./platform/fonts.js');
    await loadGameFont();
    // 小屋精修图为必需资源，加载完成后再允许进入正式场景。
    const { loadCozyCottage } = await import('./rendering/cozy-cottage.js');
    const {loadBiomeDumplingArt}=await import('./rendering/biome-dumpling-png.js');
    const {loadLivestockArt}=await import('./rendering/livestock-atlas.js');
    const {loadEraAtlas}=await import('./rendering/vehicle-eras.js');
    await Promise.all([loadCozyCottage(),loadLivestockArt(),loadEraAtlas(),loadBiomeDumplingArt()]);
    const { createApplication } = await import('./app/create-app.js');
    // 美术试玩只在明确指定参数时使用隔离内存档，普通入口继续使用原存档。
    if(new URLSearchParams(location.search).get('artPreview')==='idle-cat-pine'){
      const preview=await import('./app/idle-cat-preview.js'),storage=preview.createArtPreviewStorage();
      const app=createApplication({getStorage:()=>storage});finishTitleStart(app);
      preview.enterArtPreview(app).catch(error=>{document.getElementById('title-startup-error').textContent=error.message;document.getElementById('title-startup-error').hidden=false;console.error(error);});
      return app;
    }
    const app=createApplication({getStorage:playerStorage});finishTitleStart(app);return app;
  } catch (error) {
    finishTitleStart(null);
    const status = document.getElementById('title-startup-error');
    status.textContent = startupMessage;status.hidden=false;
    status.setAttribute('role', 'alert');
    throw error;
  }
}
export const application = await startApplication();
