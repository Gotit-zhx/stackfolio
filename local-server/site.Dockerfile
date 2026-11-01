FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases
RUN node .yarn/releases/yarn-3.6.1.cjs install --immutable
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_POSTMAKER_URL=http://localhost:8787
ARG NEXT_PUBLIC_BAICAOYUAN_URL=http://localhost:8088
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_POSTMAKER_URL=$NEXT_PUBLIC_POSTMAKER_URL NEXT_PUBLIC_BAICAOYUAN_URL=$NEXT_PUBLIC_BAICAOYUAN_URL
RUN node .yarn/releases/yarn-3.6.1.cjs build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S site && adduser -S site -G site
COPY --from=build --chown=site:site /app/public ./public
COPY --from=build --chown=site:site /app/.next/standalone ./
COPY --from=build --chown=site:site /app/.next/static ./.next/static
RUN mkdir -p .next/cache && chown site:site .next/cache
USER site
EXPOSE 3000
CMD ["node", "server.js"]
