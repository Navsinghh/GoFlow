# Collaboration server (apps/collab, Hocuspocus). It lives at the repository root
# because hosts build from the Dockerfile's folder and the server needs the workspace:
#   docker build -t flowcraft-collab .
# Works on any container host: Render, Northflank, Cloud Run, Koyeb, Railway, a VPS.
FROM node:24-slim
RUN corepack enable
WORKDIR /app

# Install only this app and the workspace packages it depends on.
COPY . .
RUN pnpm install --frozen-lockfile --filter "@flowcraft/collab..."

ENV NODE_ENV=production
WORKDIR /app/apps/collab
EXPOSE 1234
# Platforms usually inject PORT. Set DATABASE_URL_UNPOOLED (the direct database URL;
# DATABASE_URL also works) and COLLAB_SECRET.
CMD ["node", "--import", "tsx", "src/main.ts"]
