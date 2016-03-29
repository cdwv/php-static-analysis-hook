FROM node:5.9.0-slim
MAINTAINER Grzegorz Daszuta <grzegorz.daszuta@codewave.pl>

# Prepare international environment

ENV DEBIAN_FRONTEND noninteractive
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8

ADD apt/* /etc/apt/sources.list.d/
RUN apt-get install wget
RUN wget -O- https://www.dotdeb.org/dotdeb.gpg | apt-key add -

# Install git

RUN apt-get update && apt-get install -y git rsync bzip2 locales

# Build locales

RUN locale-gen --lang pl
RUN locale-gen --lang en

# Install php

RUN apt-get install -y php5-cli php7.0-cli python build-essential
RUN npm install -g gulp-cli jshint

# ADD script/ /app 

WORKDIR /app
ADD ./script/package.json /app/
ADD ./script/composer.json /app/

RUN npm install
RUN wget -O- https://getcomposer.org/installer | php
RUN php composer.phar install

ADD ./script/*.js /app/

ADD phpmd/* /app/phpmd/

ENTRYPOINT ["gulp"]
