#!/bin/bash
# Keepalive: pastikan postgres jalan terus di WSL + cegah VM tidur
while true; do
  pg_isready -q >/dev/null 2>&1 || service postgresql start >/dev/null 2>&1
  sleep 10
done