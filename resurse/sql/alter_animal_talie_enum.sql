-- Rulat ca superuser: psql -U postgres -d adopthub_web -f alter_animal_talie_enum.sql

\connect adopthub_web

CREATE TYPE talie_enum AS ENUM ('mica', 'medie', 'mare', 'foarte_mare');

ALTER TABLE animal
    ALTER COLUMN talie TYPE talie_enum USING talie::talie_enum;
