#!/bin/sh
NAME="${1}-db"

docker exec $NAME /bin/sh -c 'mysqldump --password=foobar foo > /dump/dump.sql'
