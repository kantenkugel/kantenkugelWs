FROM node:8-alpine

WORKDIR /server

COPY . /server/

RUN npm install

EXPOSE 80/tcp

CMD ["npm", "start"]