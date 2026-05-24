-- Rulat ca superuser: psql -U postgres -d adopthub_web -f alter_animal_add_locatie.sql
-- Pe Windows: deschide cmd, ruleaza "chcp 65001" inainte, sau lasa \encoding UTF8 sa se ocupe.

\encoding UTF8
\connect adopthub_web

ALTER TABLE animal
    ADD COLUMN IF NOT EXISTS locatie VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS adapost VARCHAR(100) NOT NULL DEFAULT '';

UPDATE animal SET locatie='București',  adapost='Adăpostul Speranța'       WHERE id=1;
UPDATE animal SET locatie='Cluj-Napoca',adapost='Centrul Blănuță'          WHERE id=2;
UPDATE animal SET locatie='Iași',       adapost='Adăpostul Prietenii Noștri' WHERE id=3;
UPDATE animal SET locatie='Timișoara',  adapost='Azilul Căței Fericiți'    WHERE id=4;
UPDATE animal SET locatie='Brașov',     adapost='Adăpostul Speranța'       WHERE id=5;
UPDATE animal SET locatie='București',  adapost='Centrul Blănuță'          WHERE id=6;
UPDATE animal SET locatie='Cluj-Napoca',adapost='Azilul Căței Fericiți'    WHERE id=7;
UPDATE animal SET locatie='Constanța',  adapost='Adăpostul Marin'          WHERE id=8;
UPDATE animal SET locatie='Iași',       adapost='Adăpostul Prietenii Noștri' WHERE id=9;
UPDATE animal SET locatie='Timișoara',  adapost='Azilul Căței Fericiți'    WHERE id=10;
UPDATE animal SET locatie='Brașov',     adapost='Centrul Blănuță'          WHERE id=11;
UPDATE animal SET locatie='București',  adapost='Adăpostul Speranța'       WHERE id=12;
UPDATE animal SET locatie='Constanța',  adapost='Adăpostul Marin'          WHERE id=13;
UPDATE animal SET locatie='Cluj-Napoca',adapost='Adăpostul Prietenii Noștri' WHERE id=14;
UPDATE animal SET locatie='Iași',       adapost='Centrul Blănuță'          WHERE id=15;
UPDATE animal SET locatie='Timișoara',  adapost='Adăpostul Speranța'       WHERE id=16;
UPDATE animal SET locatie='București',  adapost='Azilul Căței Fericiți'    WHERE id=17;
UPDATE animal SET locatie='Brașov',     adapost='Adăpostul Marin'          WHERE id=18;

GRANT SELECT, INSERT, UPDATE, DELETE ON animal TO adopthub_web;
