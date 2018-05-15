FROM nginx:alpine

RUN apk update -q && apk upgrade -q && apk add openssl -q

RUN mkdir -p /etc/nginx/ssl && openssl dhparam -out /etc/nginx/ssl/dhparams.pem 2048

RUN mkdir -p /data/statics && chown nginx:nginx /data/statics \
  && mkdir -p /data/keys && chown nginx:nginx /data/keys

VOLUME /var/log/nginx
VOLUME /etc/nginx/sites-enabled
VOLUME /data/statics
VOLUME /data/keys

RUN rm /etc/nginx/conf.d/default.conf

COPY . /etc/nginx/

EXPOSE 80
EXPOSE 443