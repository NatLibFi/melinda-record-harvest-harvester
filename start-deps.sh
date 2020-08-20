#!/bin/sh
if test -z "$1";then
  echo 'Usage: start-deps.sh <NAME>'
  exit 1
fi

NAME="${1}-db"

docker kill $NAME
docker kill $NAME-gui

docker volume create $NAME

docker run --rm -v $NAME:/var/lib/mysql -d --name $NAME -p 3306:3306 \
  -e MYSQL_DATABASE=foo \
  -e MYSQL_USER=foo \
  -e MYSQL_PASSWORD=bar \
  -e MYSQL_RANDOM_ROOT_PASSWORD=1 \
  mariadb:10

docker run --rm --name $NAME-gui -p 8080:80 --link $NAME:db -d phpmyadmin/phpmyadmin