#!/bin/bash
mkdir -p /var/run/postgresql
chown -R postgres:postgres /var/run/postgresql
if ! su - postgres -c "/opt/postgres/usr/lib/postgresql/15/bin/pg_isready" >/dev/null 2>&1; then
  su - postgres -c "/opt/postgres/usr/lib/postgresql/15/bin/pg_ctl -D /opt/postgres/data -l /opt/postgres/data/postgres.log start"
  sleep 1
fi
