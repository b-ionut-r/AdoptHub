-- psql -U postgres -d adopthub_web -f alter_animal_add_adoptat.sql

\connect adopthub_web

ALTER TABLE animal ADD COLUMN IF NOT EXISTS adoptat BOOLEAN NOT NULL DEFAULT false;
