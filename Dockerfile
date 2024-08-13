FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json ./

RUN pnpm install

COPY . .

RUN pnpm run build

EXPOSE 4000

CMD [ "pnpm", "run", "start:prod" ]