-- Rulat ca superuser (postgres):
-- psql -U postgres -f setup_adopthub_web.sql

CREATE DATABASE adopthub_web;

CREATE USER adopthub_web WITH PASSWORD 'adopthub2025';

\connect adopthub_web

GRANT CONNECT ON DATABASE adopthub_web TO adopthub_web;

CREATE TYPE specie_enum AS ENUM ('caine', 'pisica', 'iepure', 'hamster', 'altele');

CREATE TABLE animal (
    id                SERIAL PRIMARY KEY,
    nume              VARCHAR(80)  NOT NULL,
    descriere         TEXT,
    cale_imagine      VARCHAR(200),
    specie            specie_enum  NOT NULL,
    talie             VARCHAR(15)  NOT NULL,
    varsta_luni       INTEGER      NOT NULL,
    nivel_energie     INTEGER      NOT NULL,
    data_inregistrare DATE         NOT NULL,
    culoare           VARCHAR(20)  NOT NULL,
    trasaturi         VARCHAR(300),
    vaccinat          BOOLEAN      NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON animal TO adopthub_web;
GRANT USAGE, SELECT ON SEQUENCE animal_id_seq TO adopthub_web;

INSERT INTO animal (nume, descriere, cale_imagine, specie, talie, varsta_luni, nivel_energie, data_inregistrare, culoare, trasaturi, vaccinat) VALUES
('Max',     'Câine energic și prietenos, iubește copiii și aleargă mult. Se înțelege bine cu alte animale.',                                  'caine1.jpg', 'caine',   'mare',       24,  8,  '2024-03-15', 'maro',      'dresat,prietenos cu copii,prietenos cu alte animale', TRUE),
('Luna',    'Pisicuță jucăușă cu blană portocalie, foarte afectuoasă. Adoră jucăriile și mângâierile.',                                       'pisica1.jpg','pisica',  'mica',        6,  7,  '2024-11-20', 'portocaliu','jucauș,afectuos',                                    TRUE),
('Bruno',   'Câine mare și liniștit, dresat, potrivit pentru orice familie. Preferă plimbările lungi.',                                        'caine2.jpg', 'caine',   'foarte_mare', 48,  6,  '2023-06-10', 'negru',     'dresat,linistit',                                    TRUE),
('Mimi',    'Pisică adultă liniștită, perfectă pentru apartament. Nu are nevoie de multă atenție.',                                            'pisica2.jpg','pisica',  'mica',       36,  3,  '2022-09-05', 'alb',       'linistit,afectuos',                                  FALSE),
('Rex',     'Câine tânăr, plin de energie, are nevoie de spațiu și mișcare zilnică. Adoră joaca.',                                             'caine3.jpg', 'caine',   'mare',       12, 10,  '2024-08-22', 'bicolor',   'energic,jucauș',                                     TRUE),
('Coco',    'Iepure blând și curios, se obișnuiește repede cu oamenii. Potrivit și pentru copii.',                                             'iepure1.jpg','iepure',  'mica',        8,  4,  '2024-07-01', 'alb',       'bland,linistit',                                     FALSE),
('Pufos',   'Hamster mic și activ, îi plac roțile și tunelurile. Ușor de îngrijit.',                                                           'hamster1.jpg','hamster','mica',        3,  5,  '2025-01-10', 'portocaliu','jucauș',                                             FALSE),
('Bella',   'Cățelușă dresată și afectuoasă, iubește copiii. A locuit anterior într-o familie cu alți câini.',                                 'caine4.jpg', 'caine',   'medie',      36,  7,  '2023-11-18', 'maro',      'dresat,prietenos cu copii,afectuos',                 TRUE),
('Whiskers','Pisică gri, jucăușă dar și liniștită. Se adaptează ușor la medii noi.',                                                           'pisica3.jpg','pisica',  'mica',       18,  6,  '2024-05-30', 'gri',       'jucauș,linistit',                                    TRUE),
('Rocky',   'Câine adult dresat, calm și protector. Potrivit pentru case cu curte.',                                                            'caine5.jpg', 'caine',   'mare',       60,  5,  '2022-12-03', 'negru',     'dresat,linistit',                                    TRUE),
('Fluffy',  'Iepure alb cu blana moale, calm și afectuos. Se lasă ținut în brațe.',                                                            'iepure2.jpg','iepure',  'mica',       12,  4,  '2024-04-14', 'alb',       'bland,afectuos',                                     FALSE),
('Tom',     'Pisoi gri adult, independent și liniștit. Potrivit pentru proprietari ocupați.',                                                   'pisica4.jpg','pisica',  'medie',      48,  2,  '2023-03-22', 'gri',       'linistit',                                           FALSE),
('Lola',    'Cățelușă energică și sociabilă, adoră copiii și joaca în grup.',                                                                  'caine6.jpg', 'caine',   'medie',      18,  9,  '2024-09-01', 'bicolor',   'energic,jucauș,prietenos cu copii',                  TRUE),
('Mișu',    'Pisicuță portocalie, afectuoasă și curios. Se înțelege bine cu câinii.',                                                          'pisica5.jpg','pisica',  'mica',       24,  5,  '2024-02-17', 'portocaliu','afectuos,jucauș,prietenos cu alte animale',          TRUE),
('Gogu',   'Papagal verde vorbitor, sociabil și vesel. Știe câteva cuvinte în română.',                                                         'altele1.jpg','altele',  'mica',        6,  3,  '2025-02-28', 'verde',     'bland,jucauș',                                       FALSE),
('Alex',    'Câine mare dresat, calm și loial. Fostă câine de pază, acum caută o familie.',                                                    'caine7.jpg', 'caine',   'foarte_mare', 72,  4,  '2022-05-19', 'maro',      'dresat,linistit',                                    TRUE),
('Pisoi',   'Pui de pisică bicolor, foarte jucăuș. Are nevoie de multă atenție și jucării.',                                                   'pisica6.jpg','pisica',  'mica',        2,  8,  '2025-03-05', 'bicolor',   'jucauș,energic',                                     FALSE),
('Dino',    'Iepure maro adult, liniștit și blând. Trăiește bine în spații mici.',                                                             'iepure3.jpg','iepure',  'mica',       18,  5,  '2024-06-12', 'maro',      'bland,linistit',                                     TRUE);
