FROM node:16-alpine AS client-build

WORKDIR /app/client

COPY client/package*.json .

RUN npm install

COPY client .

RUN npm run build

FROM node:16-alpine AS server

WORKDIR /app/server

COPY server/package*.json .

RUN npm install

COPY server .

COPY --from=client-build /app/client/public /app/client/public

CMD ["node", "server.js"]

