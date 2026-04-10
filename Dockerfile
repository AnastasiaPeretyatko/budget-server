FROM node:20-alpine

ENV NODE_ENV=development
ENV DATABASE_URL=

RUN apk --no-cache add postgresql-client
RUN apk add --no-cache --virtual .gyp python3 make g++ git

# Рабочая директория
WORKDIR /home/node

# Копируем только зависимости (важно для кеша)
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

# Копируем остальной проект
COPY . .

RUN yarn build

# Права
RUN chown -R node:node /home/node

USER node