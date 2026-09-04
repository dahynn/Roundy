#!/bin/sh
set -eu

mkdir -p /home/roundy/.deepface
chown -R roundy:roundy /home/roundy/.deepface

exec gosu roundy "$@"
