FROM node:18-alpine
RUN mkdir /opt/app
WORKDIR /opt/app

COPY app/app.js package.json package-lock.json ./

RUN npm install

ENTRYPOINT ["node", "app.js"]

