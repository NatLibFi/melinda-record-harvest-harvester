#!/bin/sh
if test -z $1;then
  echo 'start-deps.sh PREFIX'
  exit 1
fi

docker kill $1-db
docker kill $1-mq
docker kill $1-adminmongo

docker volume create $1-db
docker volume create $1-mq

docker run --rm -d -v "${1}-db":/data/mongo -p 27017:27017 --name "${1}-db" mongo:4

docker run --rm -d -v "${1}-mq":/var/lib/rabbitmq -p 8081:15672 -p 5672:5672 --name "${1}-mq" rabbitmq:management

docker run --rm -d --link "${1}-db" --name "${1}-adminmongo" -p 8080:8080 \
  -e HOST=0.0.0.0 \
  -e PORT=8080 \
  -e CONN_NAME=def \
  -e DB_HOST="${1}-db" \
  -e DB_NAME=db \
  mrvautin/adminmongo