#!/bin/sh
NAME="${1}-db"

docker exec $NAME /bin/sh -c 'mysql --password=foobar foo < /dump/dump.sql'
