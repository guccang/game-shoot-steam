// 当前资源分工默认验收入口；历史清缴报告保留在原路径，避免覆盖旧方案证据。
import {validateResourceSources} from './resource-source-validation.mjs';
await validateResourceSources();
