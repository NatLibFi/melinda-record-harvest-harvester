#!/bin/sh
if test -z $1;then
  echo 'start-deps.sh PREFIX'
  exit 1
fi

docker kill "${1}-db"
docker kill "${1}-db-gui"

docker volume create $1-db

docker run --rm -d --name "${1}-db" -p 3306:3306 \
  -e MYSQL_DATABASE=foo \
  -e MYSQL_USER=foo \
  -e MYSQL_PASSWORD=bar \
  -e MYSQL_RANDOM_ROOT_PASSWORD=1 \
  mariadb

docker run --rm --name "${1}-db-gui" -p 8080:80 --link "${1}-db":db -d phpmyadmin/phpmyadmin