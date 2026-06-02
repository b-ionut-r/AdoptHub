-- Rulat ca superuser: psql -U postgres -f resurse/sql/add_utilizatori.sql

\connect adopthub_web

DROP TABLE IF EXISTS accesari CASCADE;
DROP TABLE IF EXISTS utilizatori CASCADE;

CREATE TABLE utilizatori (
    id               SERIAL PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    nume             VARCHAR(100) NOT NULL,
    prenume          VARCHAR(100) NOT NULL,
    email            VARCHAR(200) NOT NULL,
    parola           VARCHAR(500) NOT NULL,
    data_nasterii    DATE,
    data_inregistrare TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    culoare_chat     VARCHAR(50)  NOT NULL DEFAULT 'black',
    rol              VARCHAR(20)  NOT NULL DEFAULT 'comun',
    ocupatie         VARCHAR(100),
    cale_imagine     VARCHAR(300),
    cod              VARCHAR(300),
    confirmat_mail   BOOLEAN      NOT NULL DEFAULT FALSE,
    salt             VARCHAR(50),
    ultima_logare    TIMESTAMP
);

CREATE TABLE accesari (
    id              SERIAL PRIMARY KEY,
    user_id         INT NULL REFERENCES utilizatori(id) ON DELETE CASCADE,
    pagina          VARCHAR(500) NOT NULL,
    data_accesare   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

GRANT SELECT, INSERT, UPDATE, DELETE ON utilizatori TO adopthub_web;
GRANT USAGE, SELECT ON SEQUENCE utilizatori_id_seq TO adopthub_web;
GRANT SELECT, INSERT, UPDATE, DELETE ON accesari TO adopthub_web;
GRANT USAGE, SELECT ON SEQUENCE accesari_id_seq TO adopthub_web;
