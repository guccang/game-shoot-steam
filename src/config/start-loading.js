// 已完成的装配、世界、首屏纹理和导航按工作量分配，最后1%只由真实就绪放行。
export const START_LOADING_WEIGHTS=Object.freeze({bootstrap:2,world:68,ground:27,navigation:2});
// 平滑只追赶已完成的工作；100%后单独计时驶出，减少动态只保留完成提示。
export const START_LOADING_TIMING=Object.freeze({smooth:120,hold:120,exit:420,worldBudget:10,maxSteps:256,firstFrameMargin:64});
