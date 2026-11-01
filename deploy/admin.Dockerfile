FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache docker-cli

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
RUN node .yarn/releases/yarn-3.6.1.cjs install --immutable
COPY . .

RUN mkdir -p /app/.local-admin /app/public/projects
EXPOSE 9090
CMD ["node", ".yarn/releases/yarn-3.6.1.cjs", "admin"]
