-- Rulat ca superuser:
-- psql -U postgres -f add_utilizatori.sql

\connect adopthub_web

CREATE TABLE IF NOT EXISTS utilizatori (
    id        SERIAL PRIMARY KEY,
    username  VARCHAR(50)  NOT NULL UNIQUE,
    parola    VARCHAR(200) NOT NULL,
    email     VARCHAR(200),
    rol       VARCHAR(20)  NOT NULL DEFAULT 'comun',
    nume      VARCHAR(80),
    prenume   VARCHAR(80),
    poza      VARCHAR(200),
    cod       VARCHAR(200)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON utilizatori TO adopthub_web;
GRANT USAGE, SELECT ON SEQUENCE utilizatori_id_seq TO adopthub_web;
