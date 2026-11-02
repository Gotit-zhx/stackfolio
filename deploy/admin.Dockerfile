FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache docker-cli

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
# Keep only the IPv4 database used by the admin; remove IPv6 in the same layer as install.
RUN node .yarn/releases/yarn-3.6.1.cjs install --immutable \
  && rm -f /app/node_modules/ip2region/data/ip2region_v6.xdb
COPY . .

RUN mkdir -p /app/.local-admin /app/public/projects
RUN mkdir -p /app/.visitor-analytics && chown 100:100 /app/.visitor-analytics
EXPOSE 9090
CMD ["node", ".yarn/releases/yarn-3.6.1.cjs", "admin"]
