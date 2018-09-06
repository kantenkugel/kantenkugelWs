FROM node:8-alpine

LABEL author="Kantenkugel (Michael Ritter)"
LABEL version="1.1"

RUN apk update && apk upgrade && apk add --no-cache git

RUN git clone https://github.com/kantenkugel/haste-server.git

WORKDIR /haste-server

RUN npm install
RUN npm i memcached pg@7.4.3

COPY ./*.js ./

EXPOSE 7777

CMD node ./init.js && npm start