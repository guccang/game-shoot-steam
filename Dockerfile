# 使用官方 Node 运行时，游戏静态服务不需要安装开发依赖。
FROM node:22-bookworm-slim

WORKDIR /app
ARG GAME_GIT_COMMIT=unknown
ENV NODE_ENV=production PORT=4173 GAME_GIT_COMMIT=${GAME_GIT_COMMIT}
LABEL org.opencontainers.image.revision=${GAME_GIT_COMMIT}

# 仅复制运行页面、源码与处理后的素材；原始素材由 .dockerignore 排除。
COPY --chown=node:node *.html package.json server.mjs visual-contract.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node assets/ ./assets/

# 普通用户运行，健康状态只检查首页是否正常响应，不执行游戏测试。
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4173/').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.mjs"]
