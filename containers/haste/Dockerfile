FROM node:8-alpine

LABEL author="Kantenkugel (Michael Ritter)"
LABEL version="1.1"

RUN apt update && apt upgrade -y && apt install -y git

RUN git clone https://github.com/kantenkugel/haste-server.git

WORKDIR /haste-server

RUN npm install

COPY ./*.js ./

EXPOSE 7777

CMD node ./init.js && npm start