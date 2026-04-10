#!/bin/sh -e

psql --variable=ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE "budget_db";
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

psql --variable=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname=budget_db <<-EOSQL
  CREATE EXTENSION "citext";
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

