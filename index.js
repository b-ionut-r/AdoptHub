const express = require("express");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const sharp = require("sharp");
const sass = require("sass");
const session = require("express-session");
const formidable = require("formidable");
const AccesBD = require("./module_proprii/accesBD.js");
const AccesBDSequelize = require("./module_proprii/sequelize.js");
const { Op, QueryTypes } = require("sequelize");
const { Utilizator } = require("./module_proprii/utilizator.js");
const Drepturi = require("./module_proprii/drepturi.js");

const app = express();
app.set("view engine", "ejs");

const acces = AccesBD.getInstanta({ init: "local" });
const client = acces.getClient();
console.log("Conectat la baza de date adopthub_web.");

const orm = AccesBDSequelize.getInstanta();
const { Animal } = orm;

let speciiDisponibile = [];
client.query("SELECT unnest(enum_range(null::specie_enum))::text AS specie", function(err, rez) {
    if (!err) speciiDisponibile = rez.rows.map(r => r.specie);
});

const numeSpecii = {
    caine:   'Câine',
    pisica:  'Pisică',
    iepure:  'Iepure',
    hamster: 'Hamster',
    altele:  'Alte animale'
};

const luniRo = ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"];
const zileRo = ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"];
/**
 * Formatează o dată ca string în română (zi lună an, ziua săptămânii).
 * @param {string|Date} d - Data de formatat
 * @returns {string} Data formatată, ex: "15 Martie 2024 (Vineri)"
 */
function formateazaData(d) {
    let data = new Date(d);
    return `${data.getDate()} ${luniRo[data.getMonth()]} ${data.getFullYear()} (${zileRo[data.getDay()]})`;
}

console.log("Folder index.js (__dirname):", __dirname);
console.log("Cale fișier (__filename):", __filename);
console.log("Folder curent de lucru (process.cwd()):", process.cwd());
// __dirname și process.cwd() nu sunt întotdeauna același lucru.
// __dirname = folderul fișierului index.js; process.cwd() = folderul din care a fost pornit Node.

obGlobal = {
    obErori: null,
    obGalerie: null,
    folderScss: path.join(__dirname, "resurse", "scss"),
    folderCss: path.join(__dirname, "resurse", "css"),
    dataModificare: null
};

let config = JSON.parse(fs.readFileSync(path.join(__dirname, "resurse/json/config.json")));
fs.watch(path.join(__dirname, "resurse/json/config.json"), function() {
    try { config = JSON.parse(fs.readFileSync(path.join(__dirname, "resurse/json/config.json"))); } catch(e) {}
});

// Creare foldere necesare
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate", "poze_uploadate"];
for (let folder of vect_foldere) {
    let caleFull = path.join(__dirname, folder);
    if (!fs.existsSync(caleFull)) {
        fs.mkdirSync(caleFull, { recursive: true });
    }
}

// Bonus 13: ștergere automată fișiere vechi din backup/
const T_BACKUP_MIN = 60;
setInterval(function() {
    let fb = path.join(__dirname, "backup");
    fs.readdir(fb, function(err, fisiere) {
        if (err) return;
        for (let f of fisiere) {
            let c = path.join(fb, f);
            fs.stat(c, function(e, s) {
                if (!e && Date.now() - s.mtimeMs > T_BACKUP_MIN * 60000)
                    fs.unlink(c, () => {});
            });
        }
    });
}, T_BACKUP_MIN * 60000);

// Folder static
app.use("/resurse", express.static(path.join(__dirname, "resurse")));
app.use("/dist", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));
app.use("/poze_uploadate", express.static(path.join(__dirname, "poze_uploadate")));

// [etapa8] sesiune express-session
app.use(session({ secret: "adopthub2025", resave: true, saveUninitialized: false }));

// [etapa8-bonus] site in mentenanta - middleware config.json
app.use(function(req, res, next) {
    if (config.mentenanta) { res.render("pagini/mentenanta"); return; }
    next();
});

// [etapa8] middleware global - sesiune → locals, utilizatori online, data modificare
app.use(function(req, res, next) {
    res.locals.ip = req.ip;
    res.locals.speciiDisponibile = speciiDisponibile;
    res.locals.numeSpecii = numeSpecii;
    res.locals.formateazaData = formateazaData;
    res.locals.caleCurenta = req.path;
    res.locals.Drepturi = Drepturi;
    res.locals.mesajLogin = req.session.mesajLogin || "";
    req.session.mesajLogin = "";
    if (req.session.utilizator) {
        req.utilizator = res.locals.utilizator = new Utilizator(req.session.utilizator);
        // [etapa8] accesari - inregistrare acces pagina
        client.query("INSERT INTO accesari(user_id, pagina) VALUES($1, $2)", [req.utilizator.id, req.path]);
    }
    // [etapa8] utilizatori online - activi (<5min verde) si inactivi (5-10min portocaliu)
    client.query(
        "SELECT u.username, u.nume, u.prenume, MAX(a.data_accesare) as ult FROM utilizatori u JOIN accesari a ON a.user_id=u.id WHERE a.data_accesare > NOW()-INTERVAL '10 minutes' GROUP BY u.id,u.username,u.nume,u.prenume",
        function(err, rez) {
            if (!err && rez.rowCount > 0) {
                res.locals.utilizatoriOnline = rez.rows.map(function(u) {
                    let diff = (new Date() - new Date(u.ult)) / 60000;
                    let culoare = diff < 5 ? "green" : "orange";
                    return `<span style="color:${culoare}">${u.username}(${u.nume} ${u.prenume})</span>`;
                }).join("; ");
            } else {
                res.locals.utilizatoriOnline = "";
            }
            // [etapa8-bonus] data ultimei modificari - avertisment daca site s-a schimbat
            res.locals.afiseazaAvertisment = false;
            if (obGlobal.dataModificare) {
                let refDate = null;
                if (req.utilizator && req.utilizator.ultima_logare)
                    refDate = new Date(req.utilizator.ultima_logare);
                else {
                    let accRow = rez && rez.rows ? null : null;
                    refDate = req.session.ultimaAccesare ? new Date(req.session.ultimaAccesare) : null;
                }
                if (refDate && refDate < obGlobal.dataModificare)
                    res.locals.afiseazaAvertisment = true;
            }
            req.session.ultimaAccesare = new Date();
            next();
        }
    );
});

// [etapa8] stergere automata accesari mai vechi de o zi (la fiecare ora)
setInterval(function() {
    client.query("DELETE FROM accesari WHERE data_accesare < NOW() - INTERVAL '1 day'");
}, 60 * 60 * 1000);

/**
 * Verifică proprietăți duplicate în conținutul unui fișier JSON.
 * @param {string} continut - Conținutul fișierului ca string
 * @param {string} caleFisier - Calea fișierului (pentru mesajele de eroare)
 */
function verificaDuplicateProprietati(continut, caleFisier) {
    let stiva = [], i = 0, n = continut.length;
    while (i < n) {
        if (continut[i] === '{') { stiva.push(new Set()); i++; }
        else if (continut[i] === '}') { stiva.pop(); i++; }
        else if (continut[i] === '"') {
            let start = ++i;
            while (i < n && (continut[i] !== '"' || continut[i-1] === '\\')) i++;
            let cheie = continut.slice(start, i++);
            let j = i; while (j < n && ' \t\n\r'.includes(continut[j])) j++;
            if (continut[j] === ':' && stiva.length > 0) {
                let set = stiva[stiva.length - 1];
                if (set.has(cheie)) console.error(`AVERTISMENT: Proprietatea "${cheie}" apare de mai multe ori în același obiect din ${caleFisier}.`);
                else set.add(cheie);
            }
        } else i++;
    }
}

/**
 * Validează structura și conținutul fișierului erori.json.
 * Afișează avertismente în consolă dacă structura este incorectă.
 */
function verificaErori() {
    let caleFisier = path.join(__dirname, "resurse/json/erori.json");
    if (!fs.existsSync(caleFisier)) {
        console.error(`EROARE CRITICĂ: Fișierul erori.json nu există: ${caleFisier}`);
        process.exit(1);
    }
    let continut = fs.readFileSync(caleFisier).toString("utf-8");
    verificaDuplicateProprietati(continut, caleFisier);
    let erori = JSON.parse(continut);

    // Proprietăți de nivel superior lipsă
    ["info_erori", "cale_baza", "eroare_default"].forEach(p => {
        if (!erori[p]) console.error(`EROARE: Proprietatea "${p}" lipsește din erori.json.`);
    });

    // Proprietăți lipsă din eroare_default
    if (erori.eroare_default)
        ["titlu", "text", "imagine"].forEach(p => {
            if (!erori.eroare_default[p]) console.error(`EROARE: Proprietatea "${p}" lipsește din eroare_default.`);
        });

    // Folderul cale_baza nu există
    if (erori.cale_baza) {
        let caleFolder = path.join(__dirname, erori.cale_baza);
        if (!fs.existsSync(caleFolder)) console.error(`EROARE: Folderul "cale_baza" nu există: ${caleFolder}`);
    }

    // Imagini inexistente
    let verificaImg = (img, ctx) => {
        if (!img) return;
        let cale = path.join(__dirname, erori.cale_baza, img);
        if (!fs.existsSync(cale)) console.error(`EROARE: Imaginea din ${ctx} ("${img}") nu există: ${cale}`);
    };
    if (erori.cale_baza && erori.eroare_default) verificaImg(erori.eroare_default.imagine, "eroare_default");
    if (erori.cale_baza && erori.info_erori)
        erori.info_erori.forEach(e => verificaImg(e.imagine, `eroarea ${e.identificator}`));

    // Identificatori duplicați
    if (erori.info_erori) {
        let freq = {};
        erori.info_erori.forEach(e => freq[e.identificator] = (freq[e.identificator] || 0) + 1);
        for (let id in freq) {
            if (freq[id] > 1) {
                let det = erori.info_erori.filter(e => e.identificator == id)
                    .map(({ identificator, ...rest }) => JSON.stringify(rest)).join(" | ");
                console.error(`EROARE: Identificatorul ${id} apare de ${freq[id]} ori în info_erori. Detalii: ${det}`);
            }
        }
    }
}
verificaErori();

/**
 * Încarcă și procesează fișierul erori.json în obGlobal.obErori.
 */
function initErori() {
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/erori.json")).toString("utf-8");
    let erori = obGlobal.obErori = JSON.parse(continut);
    let errDefault = erori.eroare_default;
    errDefault.imagine = path.join(erori.cale_baza, errDefault.imagine);
    for (let eroare of erori.info_erori) {
        eroare.imagine = path.join(erori.cale_baza, eroare.imagine);
    }
}
initErori();

/**
 * Încarcă fișierul galerie.json în obGlobal.obGalerie.
 */
function initGalerie() {
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");
    obGlobal.obGalerie = JSON.parse(continut);
}

/**
 * Returnează calea web a folderului de galerie (cu slash-uri forward).
 * @returns {string} Calea web relativă, ex: "/resurse/galerie"
 */
function obtineCaleWebGalerie() {
    return "/" + obGlobal.obGalerie.cale_galerie.replace(/\\/g, "/").replace(/^\/+/, "");
}

/**
 * Selectează un subset aleatoriu de imagini impare din galerie pentru galeria animată.
 * @returns {{ nr_imagini: number, imagini: Object[] }} Numărul și lista imaginilor selectate
 */
function obtineImaginiGalerieAnimata() {
    /* indexi impari (0-based) */
    let imaginiEligibile = obGlobal.obGalerie.imagini.filter((_, index) => index % 2 === 0);
    let nrMaxim = Math.min(14, imaginiEligibile.length);
    if (nrMaxim % 2) nrMaxim--;
    let nrMinim = Math.min(6, nrMaxim);
    /* numar par aleator din intervalul [nrMinim, nrMaxim], cu pasul 2 (doar numere pare) */
    let nrImagini = nrMaxim > 0
        ? nrMinim + Math.floor(Math.random() * ((nrMaxim - nrMinim) / 2 + 1)) * 2
        : 0;
    let caleGalerieWeb = obtineCaleWebGalerie();

    return {
        nr_imagini: nrImagini,
        imagini: imaginiEligibile.slice(0, nrImagini).map(imagine => ({
            ...imagine,
            alt_final: imagine.alt || path.parse(imagine.cale_imagine).name,
            title_final: `${imagine.titlu}. ${imagine.descriere}`,
            sursa: `${caleGalerieWeb}/${imagine.cale_imagine}`,
            sursa_mediu: `${caleGalerieWeb}/mediu/${imagine.cale_imagine}`
        }))
    };
}

/**
 * Compilează un fișier SCSS template EJS cu date dinamice și îl scrie ca CSS.
 * @param {string} caleScssTemplate - Calea fișierului .scss template EJS
 * @param {string} caleCss - Calea de destinație pentru fișierul CSS generat
 * @param {Object} dateTemplate - Datele injectate în template EJS
 */
function compileazaScssDinTemplate(caleScssTemplate, caleCss, dateTemplate) {
    let continutTemplate = fs.readFileSync(caleScssTemplate).toString("utf-8");
    let continutScss = ejs.render(continutTemplate, dateTemplate);
    let caleScssTemp = path.join(__dirname, "temp", path.parse(caleScssTemplate).name + ".generated.scss");
    fs.writeFileSync(caleScssTemp, continutScss);
    compileazaScss(caleScssTemp, caleCss);
}

/**
 * Validează structura și conținutul fișierului galerie.json.
 * Afișează erori în consolă dacă structura sau imaginile sunt incorecte.
 */
function verificaDateGalerie() {
    let caleFisier = path.join(__dirname, "resurse/json/galerie.json");
    if (!fs.existsSync(caleFisier)) {
        console.error(`EROARE GALERIE: Fișierul galerie.json nu există: ${caleFisier}`);
        return;
    }

    let galerie;
    try {
        let continut = fs.readFileSync(caleFisier).toString("utf-8");
        galerie = JSON.parse(continut);
    } catch (err) {
        console.error(`EROARE GALERIE: Fișierul galerie.json nu este JSON valid. Detalii: ${err.message}`);
        return;
    }

    if (!galerie.cale_galerie) {
        console.error("EROARE GALERIE: Proprietatea \"cale_galerie\" lipsește din galerie.json.");
        return;
    }

    let caleFolderGalerie = path.join(__dirname, galerie.cale_galerie);
    if (!fs.existsSync(caleFolderGalerie) || !fs.statSync(caleFolderGalerie).isDirectory()) {
        console.error(`EROARE GALERIE: Folderul specificat în \"cale_galerie\" nu există: ${caleFolderGalerie}`);
    }

    if (!Array.isArray(galerie.imagini)) {
        console.error("EROARE GALERIE: Proprietatea \"imagini\" trebuie să fie un vector în galerie.json.");
        return;
    }

    galerie.imagini.forEach((imagine, index) => {
        if (!imagine.cale_imagine) {
            console.error(`EROARE GALERIE: Imaginea de pe poziția ${index} nu are proprietatea \"cale_imagine\".`);
            return;
        }
        let caleImagine = path.join(caleFolderGalerie, imagine.cale_imagine);
        if (!fs.existsSync(caleImagine)) {
            console.error(`EROARE GALERIE: Fișierul imagine \"${imagine.cale_imagine}\" (poziția ${index}) nu există în sistemul de fișiere: ${caleImagine}`);
        }
    });
}
verificaDateGalerie();
initGalerie();

function maxMtimeEjs(folder) {
    let max = 0;
    try {
        for (let f of fs.readdirSync(folder)) {
            let p = path.join(folder, f);
            let st = fs.statSync(p);
            if (st.isDirectory()) {
                let sub = maxMtimeEjs(p);
                if (sub > max) max = sub;
            } else if (f.endsWith(".ejs")) {
                if (st.mtimeMs > max) max = st.mtimeMs;
            }
        }
    } catch(e) {}
    return max;
}

function calculeazaDataModificare() {
    let ejsDate = maxMtimeEjs(path.join(__dirname, "views"));
    client.query("SELECT MAX(data_inregistrare) as m FROM animal", function(err, rez) {
        let animalDate = (!err && rez.rows[0].m) ? new Date(rez.rows[0].m).getTime() : 0;
        obGlobal.dataModificare = new Date(Math.max(ejsDate, animalDate));
    });
}
calculeazaDataModificare();
fs.watch(path.join(__dirname, "views"), { recursive: true }, function(ev, f) {
    if (f && f.endsWith(".ejs")) calculeazaDataModificare();
});

/**
 * Compilează un fișier SCSS în CSS, cu backup automat al versiunii anterioare.
 * @param {string} caleScss - Calea fișierului SCSS (absolută sau relativă la folderScss)
 * @param {string} [caleCss] - Calea de destinație CSS; dacă lipsește, se deduce din numele fișierului SCSS
 */
function compileazaScss(caleScss, caleCss) {
    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }
    if (!caleCss) {
        let numeFisier = path.parse(caleScss).name + ".css";
        caleCss = path.join(obGlobal.folderCss, numeFisier);
    } else if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }

    if (fs.existsSync(caleCss)) {
        let infoFisier = path.parse(caleCss);
        let timestamp = Date.now();
        let numeFisier = `${infoFisier.name}_${timestamp}${infoFisier.ext}`;
        let caleBackup = path.join(__dirname, "backup", "resurse", "css", numeFisier);
        try {
            fs.mkdirSync(path.dirname(caleBackup), { recursive: true });
            fs.copyFileSync(caleCss, caleBackup);
        } catch (err) {
            console.error(`EROARE la backup ${numeFisier}:`, err.message);
        }
    }

    try {
        let result = sass.compile(caleScss);
        fs.writeFileSync(caleCss, result.css);
        console.log(`SCSS compilat: ${path.basename(caleScss)} → ${path.basename(caleCss)}`);
    } catch (err) {
        console.error(`EROARE la compilarea SCSS ${path.basename(caleScss)}:`, err.message);
    }
}

fs.readdirSync(obGlobal.folderScss)
    .filter(f => f.endsWith(".scss"))
    .forEach(f => compileazaScss(f));

fs.watch(obGlobal.folderScss, function(eventType, filename) {
    if (filename && filename.endsWith(".scss")) {
        compileazaScss(filename);
    }
});

/**
 * Convertește un text de forma "HH:MM" în numărul total de minute de la miezul nopții.
 * @param {string} textOra - Ora în format "HH:MM"
 * @returns {number} Numărul de minute
 */
function minuteDinTextOra(textOra) {
    let [ore, minute] = textOra.split(":").map(elem => parseInt(elem));
    return ore * 60 + minute;
}

/**
 * Returnează ora curentă ca minute totale și ca string "HH:MM".
 * @returns {{ minute: number, text: string }}
 */
function obtineOraCurentaGalerie() {
    // Pentru verificare se poate inlocui temporar cu o data fixa.
    let dataCurenta = new Date();
    // let dataCurenta = new Date(); dataCurenta.setHours(7, 0);   // 07:00 → 7 imagini  (dimineata; prinde si cele 2 care trec miezul noptii: pisoi-alb-negru, pisoi-somnoros)
    // let dataCurenta = new Date(); dataCurenta.setHours(13, 0);  // 13:00 → 14 imagini, taiate la 10 (cel mai aglomerat — testeaza slice-ul)
    // let dataCurenta = new Date(); dataCurenta.setHours(23, 30); // 23:30 → 5 imagini  (seara tarzie; activ: luna-odihna, pisoi-alb-negru, caine-culcat, pisoi-somnoros, portret-caine)
    // let dataCurenta = new Date(); dataCurenta.setHours(3, 0);   // 03:00 → 3 imagini  (noapte: doar pisoi-alb-negru 20:00-08:00, pisoi-somnoros 22:00-10:00, portret-caine 00:00-23:59)
    let ore = String(dataCurenta.getHours()).padStart(2, "0");
    let minute = String(dataCurenta.getMinutes()).padStart(2, "0");
    return {
        minute: dataCurenta.getHours() * 60 + dataCurenta.getMinutes(),
        text: `${ore}:${minute}`
    };
}

/**
 * Verifică dacă un număr de minute se află într-un interval "HH:MM-HH:MM".
 * Suportă intervale care trec peste miezul nopții (ex: "22:00-06:00").
 * @param {number} oraCurentaMinute - Ora curentă exprimată în minute totale
 * @param {string} interval - Intervalul, ex: "08:00-22:00"
 * @returns {boolean}
 */
function esteInInterval(oraCurentaMinute, interval) {
    let [inceput, sfarsit] = interval.split("-");
    let minuteInceput = minuteDinTextOra(inceput);
    let minuteSfarsit = minuteDinTextOra(sfarsit);
    
    if (minuteInceput <= minuteSfarsit) {
        return oraCurentaMinute >= minuteInceput && oraCurentaMinute <= minuteSfarsit;
    } else {
        // Intervalul trece peste miezul nopții (ex: 22:00-10:00)
        return oraCurentaMinute >= minuteInceput || oraCurentaMinute <= minuteSfarsit;
    }
}

/**
 * Generează variantele redimensionate (mediu, mic) ale imaginilor din galerie, dacă nu există deja.
 * @returns {Promise<void>}
 */
async function genereazaVarianteGalerie() {
    let caleGalerie = path.join(__dirname, obGlobal.obGalerie.cale_galerie);
    let variante = [
        { folder: "mediu", latime: 360, inaltime: 240 },
        { folder: "mic", latime: 240, inaltime: 160 }
    ];

    for (let imagine of obGlobal.obGalerie.imagini) {
        let caleImagineMare = path.join(caleGalerie, imagine.cale_imagine);

        for (let varianta of variante) {
            let caleImagineVarianta = path.join(caleGalerie, varianta.folder, imagine.cale_imagine);

            if (!fs.existsSync(caleImagineVarianta)) {
                fs.mkdirSync(path.dirname(caleImagineVarianta), { recursive: true });
                await sharp(caleImagineMare)
                    .resize(varianta.latime, varianta.inaltime, {
                        fit: "cover",
                        position: "attention"
                    })
                    .toFile(caleImagineVarianta);
            }
        }
    }
}

/**
 * Construiește obiectul galerie cu imaginile filtrate după ora curentă.
 * @returns {Promise<{ ora_curenta: string, imagini: Object[] }>}
 */
async function obtineGalerie() {
    await genereazaVarianteGalerie();

    let infoOra = obtineOraCurentaGalerie();
    let caleGalerieWeb = obtineCaleWebGalerie();

    let imagini = obGlobal.obGalerie.imagini
        .filter(imagine => esteInInterval(infoOra.minute, imagine.timp))
        .slice(0, 10)
        .map(imagine => ({
            ...imagine,
            alt_final: imagine.alt || path.parse(imagine.cale_imagine).name,
            title_final: `${imagine.titlu}. ${imagine.descriere}`,
            sursa_mare: `${caleGalerieWeb}/${imagine.cale_imagine}`,
            sursa_mediu: `${caleGalerieWeb}/mediu/${imagine.cale_imagine}`,
            sursa_mica: `${caleGalerieWeb}/mic/${imagine.cale_imagine}`
        }));

    return {
        ora_curenta: infoOra.text,
        imagini: imagini
    };
}

/**
 * Randează pagina de eroare corespunzătoare identificatorului dat.
 * @param {import('express').Response} res - Obiectul response Express
 * @param {string|number} [identificator] - Codul erorii din erori.json
 * @param {string} [titlu] - Titlu personalizat (suprascrie cel din JSON)
 * @param {string} [text] - Text personalizat
 * @param {string} [imagine] - Cale imagine personalizată
 */
function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(elem => elem.identificator == identificator);
    let errDefault = obGlobal.obErori.eroare_default;
    if (eroare && eroare.status)
        res.status(eroare.identificator);
    res.render("pagini/eroare", {
        imagine: imagine || (eroare ? eroare.imagine : errDefault.imagine),
        titlu: titlu || (eroare ? eroare.titlu : errDefault.titlu),
        text: text || (eroare ? eroare.text : errDefault.text),
    });
}

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse/ico/favicon.ico"));
});

app.get(["/", "/index", "/home"], async function(req, res) {
    try {
        let animaleNoi = [];
        try {
            let rows = await Animal.findAll({
                where: { data_inregistrare: { [Op.gte]: new Date(Date.now() - 365*24*60*60*1000) } },
                order: [["data_inregistrare", "DESC"]],
                limit: 5
            });
            animaleNoi = rows.map(a => a.dataValues);
        } catch(e) {}
        res.render("pagini/index", {
            galerie: await obtineGalerie(),
            afiseazaLinkGalerie: true,
            animaleNoi
        });
    } catch (err) {
        console.error(err);
        afisareEroare(res);
    }
});

app.get("/despre", function(req, res) {
    res.render("pagini/despre");
});

/**
 * Afișează pagina cu adăposturile partenere.
 */
app.get("/adaposturi", function(req, res) {
    res.render("pagini/adaposturi");
});

app.get(["/galerie", "/galerie-statica"], async function(req, res) {
    try {
        res.render("pagini/galerie", {
            galerie: await obtineGalerie(),
            afiseazaLinkGalerie: false
        });
    } catch (err) {
        console.error(err);
        afisareEroare(res);
    }
});

app.get("/galerie-dinamica", async function(req, res) {
    try {
        let galerieAnimata = obtineImaginiGalerieAnimata();
        compileazaScssDinTemplate(path.join(__dirname, "resurse", "scss_ejs", "galerie_animata.scss"), path.join(__dirname, "resurse", "css", "galerie-animata.css"), {
            nrImagini: galerieAnimata.nr_imagini
        });

        res.render("pagini/galerie-dinamica", {
            galerieAnimata: galerieAnimata,
            timestampCss: Date.now()
        });
    } catch (err) {
        console.error(err);
        afisareEroare(res);
    }
});

// app.get("/animale", function(req, res) {
//     let specie = req.query.specie;
//     let comanda, parametri;
//     if (specie) {
//         comanda = "SELECT * FROM animal WHERE specie=$1::specie_enum ORDER BY id";
//         parametri = [specie];
//     } else {
//         comanda = "SELECT * FROM animal ORDER BY id";
//         parametri = [];
//     }
//     client.query(comanda, parametri, function(err, rez) {
//         if (err) { afisareEroare(res); return; }
//         res.render("pagini/animale", {
//             animale: rez.rows,
//             specieSelectata: specie || "toate"
//         });
//     });
// });

app.get("/animale", async function(req, res) {
    let specie = req.query.specie;
    try {
        let where = {};
        if (specie) where.specie = specie;
        let animale = await Animal.findAll({ where, order: [["id", "ASC"]] });

        // Bonus 1: statistici pentru atributele inputurilor
        let stats = {};
        let talii = [], locatii = [];
        try {
            let rows = await orm.getSequelize().query(
                `SELECT MIN(nivel_energie) min_e, MAX(nivel_energie) max_e,
                        COUNT(*) FILTER (WHERE vaccinat=true)  nr_vac,
                        COUNT(*) FILTER (WHERE vaccinat=false) nr_nevac,
                        COUNT(*) FILTER (WHERE data_inregistrare >= CURRENT_DATE - INTERVAL '1 year') nr_recent
                 FROM animal`,
                { type: QueryTypes.SELECT }
            );
            stats = rows[0] || {};
        } catch(e) {}
        try {
            talii = await orm.getSequelize().query(
                "SELECT DISTINCT talie FROM animal WHERE talie IS NOT NULL ORDER BY talie",
                { type: QueryTypes.SELECT }
            );
        } catch(e) {}
        try {
            locatii = await orm.getSequelize().query(
                "SELECT DISTINCT locatie FROM animal WHERE locatie IS NOT NULL ORDER BY locatie",
                { type: QueryTypes.SELECT }
            );
        } catch(e) {}

        res.render("pagini/animale", {
            animale: animale.map(a => a.dataValues),
            specieSelectata: specie || "toate",
            stats, talii, locatii
        });
    } catch (err) { console.error(err); afisareEroare(res); }
});

app.get("/animal/:id", function(req, res) {
    let id = parseInt(req.params.id);
    if (isNaN(id)) { afisareEroare(res, 404); return; }
    client.query("SELECT * FROM animal WHERE id=$1", [id], function(err, rez) {
        if (err) { afisareEroare(res); return; }
        if (rez.rowCount === 0) { afisareEroare(res, 404); return; }
        res.render("pagini/animal", { animal: rez.rows[0] });
    });
});

// app.get("/animal/:id", async function(req, res) {
//     let id = parseInt(req.params.id);
//     if (isNaN(id)) { afisareEroare(res, 404); return; }
//     try {
//         let animal = await Animal.findByPk(id);
//         if (!animal) { afisareEroare(res, 404); return; }
//         // Bonus 16: animale similare (aceeași specie)
//         let similare = await Animal.findAll({
//             where: { specie: animal.specie, id: { [Op.ne]: id } },
//             limit: 3
//         });
//         res.render("pagini/animal", {
//             animal: animal.dataValues,
//             similare: similare.map(s => s.dataValues)
//         });
//     } catch (err) { console.error(err); afisareEroare(res); }
// });

// ==================== [etapa8] SISTEM UTILIZATORI ====================

// [etapa8] pagina inregistrare
app.get("/inregistrare", function(req, res) {
    res.render("pagini/inregistrare", {});
});

// [etapa8] inregistrare utilizator - validare server + upload poza + email confirmare
app.post("/inregistrare", function(req, res) {
    let username, cale_imagine;
    let formular = new formidable.IncomingForm();
    formular.on("field", function(name, val) {
        if (name === "username") username = val;
    });
    formular.on("fileBegin", function(name, fisier) {
        if (name === "cale_imagine" && fisier.originalFilename) {
            let folder = path.join(__dirname, "poze_uploadate", username || "tmp");
            if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
            fisier.filepath = path.join(folder, fisier.originalFilename);
            cale_imagine = `poze_uploadate/${username}/${fisier.originalFilename}`;
        }
    });
    formular.parse(req, function(err, f) {
        let erori = [];
        let reNume = /^[A-Za-zÀ-ÿĀ-ſ\s-]+$/;
        let reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!f.username || !f.username[0]) erori.push("Username obligatoriu.");
        if (!f.nume || !f.nume[0]) erori.push("Numele este obligatoriu.");
        if (!f.prenume || !f.prenume[0]) erori.push("Prenumele este obligatoriu.");
        if (!f.parola || !f.parola[0]) erori.push("Parola este obligatorie.");
        if (!f.email || !f.email[0]) erori.push("Email-ul este obligatoriu.");
        if (f.nume && f.nume[0] && !reNume.test(f.nume[0])) erori.push("Numele poate conține doar litere, spații și liniuță.");
        if (f.prenume && f.prenume[0] && !reNume.test(f.prenume[0])) erori.push("Prenumele poate conține doar litere, spații și liniuță.");
        if (f.email && f.email[0] && !reEmail.test(f.email[0])) erori.push("Format email invalid.");
        if (f.parola && f.parola[0] && f.parola[0].length < 6) erori.push("Parola trebuie să aibă cel puțin 6 caractere.");
        if (erori.length > 0) {
            res.render("pagini/inregistrare", { err: erori.join(" ") });
            return;
        }
        Utilizator.getUtilizDupaUsername(f.username[0], {}, function(u, ob, eroare) {
            if (eroare !== -1) {
                let candidati = [1,2,3,4,5].map(() => f.username[0] + Math.floor(Math.random()*900+100));
                client.query(
                    `SELECT username FROM utilizatori WHERE username = ANY(ARRAY[${candidati.map(c=>`'${c}'`).join(",")}])`,
                    function(errQ, rez) {
                        let existente = (errQ || !rez) ? [] : rez.rows.map(r => r.username);
                        let sugestii = candidati.filter(c => !existente.includes(c)).slice(0, 3);
                        res.render("pagini/inregistrare", { err: "Username-ul este deja folosit de alt utilizator.", sugestii });
                    }
                );
                return;
            }
            let utiliz = new Utilizator({
                username: f.username[0],
                nume: f.nume[0],
                prenume: f.prenume[0],
                email: f.email[0],
                parola: f.parola[0],
                data_nasterii: f.data_nasterii ? f.data_nasterii[0] : null,
                culoare_chat: f.culoare_chat ? f.culoare_chat[0] : "black",
                ocupatie: f.ocupatie ? f.ocupatie[0] : "",
                cale_imagine: cale_imagine || ""
            });
            utiliz.salvareUtilizator();
            res.render("pagini/inregistrare", { raspuns: "Înregistrare cu succes! Verificați email-ul pentru confirmare." });
        });
    });
});

// [etapa8] login - autentificare cu parola criptata + verificare confirmat_mail + session
app.post("/login", function(req, res) {
    let formular = new formidable.IncomingForm();
    formular.parse(req, function(err, f) {
        Utilizator.getUtilizDupaUsername(f.username ? f.username[0] : "", { req, res, parola: f.parola ? f.parola[0] : "" }, function(u, ob, eroare) {
            if (eroare) {
                ob.req.session.mesajLogin = "Date de logare incorecte!";
                ob.res.redirect("/");
                return;
            }
            let parolaCriptata = Utilizator.criptareParola(ob.parola, u.salt || "adopthub");
            if (u.parola === parolaCriptata && u.confirmat_mail) {
                ob.req.session.utilizator = u;
                ob.req.session.mesajLogin = "";
                client.query("UPDATE utilizatori SET ultima_logare=NOW() WHERE id=$1", [u.id]);
                ob.res.redirect("/");
            } else if (u.parola === parolaCriptata && !u.confirmat_mail) {
                ob.req.session.mesajLogin = "Nu ai confirmat adresa de e-mail! Verifică căsuța poștală.";
                ob.res.redirect("/");
            } else {
                ob.req.session.mesajLogin = "Date de logare incorecte!";
                ob.res.redirect("/");
            }
        });
    });
});

// [etapa8] logout - distrugere sesiune + redirect
app.get("/logout", function(req, res) {
    req.session.destroy();
    res.redirect("/");
});

// [etapa8] confirmare email - verificare token == cod din BD, setare confirmat_mail=true
app.get("/confirmare/:username/:token", function(req, res) {
    Utilizator.getUtilizDupaUsername(req.params.username, {}, function(u, ob, eroare) {
        if (eroare || !u) {
            res.render("pagini/confirmare", { ok: false });
            return;
        }
        if (u.cod !== req.params.token) {
            res.render("pagini/confirmare", { ok: false });
            return;
        }
        AccesBD.getInstanta().update({
            tabel: "utilizatori",
            campuri: { confirmat_mail: true },
            conditiiAnd: [`id=${u.id}`]
        }, function(err) {
            res.render("pagini/confirmare", { ok: !err });
        });
    });
});

// [etapa8] profil utilizator - date prepopulate, username readonly
app.get("/profil", function(req, res) {
    if (!req.utilizator) { res.redirect("/"); return; }
    res.render("pagini/profil", { raspuns: "", err: "" });
});

// [etapa8] profil POST - modificare date cu verificare parola + upload poza.png + email notificare
app.post("/profil", function(req, res) {
    if (!req.utilizator) { res.redirect("/"); return; }
    let utilizatorul = req.utilizator;
    let cale_imagine;
    let username = utilizatorul.username;
    let formular = new formidable.IncomingForm();
    formular.on("fileBegin", function(name, fisier) {
        if (name === "cale_imagine" && fisier.originalFilename) {
            let folder = path.join(__dirname, "poze_uploadate", username);
            if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
            fisier.filepath = path.join(folder, "poza.png");
            cale_imagine = `poze_uploadate/${username}/poza.png`;
        }
    });
    formular.parse(req, function(err, f) {
        let parolaIntrodusa = f.parola_curenta ? f.parola_curenta[0] : "";
        let parolaCriptata = Utilizator.criptareParola(parolaIntrodusa, utilizatorul.salt || "adopthub");
        if (utilizatorul.parola !== parolaCriptata) {
            res.render("pagini/profil", { err: "Parola introdusă este incorectă!", raspuns: "" });
            return;
        }
        let campuri = {
            nume: f.nume ? f.nume[0] : utilizatorul.nume,
            prenume: f.prenume ? f.prenume[0] : utilizatorul.prenume,
            email: f.email ? f.email[0] : utilizatorul.email,
            culoare_chat: f.culoare_chat ? f.culoare_chat[0] : utilizatorul.culoare_chat,
            ocupatie: f.ocupatie ? f.ocupatie[0] : utilizatorul.ocupatie
        };
        if (f.data_nasterii && f.data_nasterii[0]) campuri.data_nasterii = f.data_nasterii[0];
        if (cale_imagine) campuri.cale_imagine = cale_imagine;
        if (f.parola_noua && f.parola_noua[0]) {
            let newSalt = require("./module_proprii/parole.js").genereazaToken(16);
            campuri.parola = Utilizator.criptareParola(f.parola_noua[0], newSalt);
            campuri.salt = newSalt;
        }
        AccesBD.getInstanta().update({
            tabel: "utilizatori",
            campuri: campuri,
            conditiiAnd: [`id=${utilizatorul.id}`]
        }, function(errU) {
            if (errU) { res.render("pagini/profil", { err: "Eroare la salvare!", raspuns: "" }); return; }
            let emailNou = f.email ? f.email[0] : utilizatorul.email;
            let utiliz = new Utilizator({ ...utilizatorul, email: emailNou });
            utiliz.trimiteMail("Date actualizate AdoptHub", "Datele tale au fost actualizate.",
                `<p>Datele tale au fost actualizate pe <strong>AdoptHub</strong>.</p><p>Nume: ${campuri.nume} ${campuri.prenume}</p><p>Email: ${emailNou}</p>`);
            AccesBD.getInstanta().select({ tabel: "utilizatori", campuri: ["*"], conditiiAnd: [`id=${utilizatorul.id}`] },
                function(errS, rez) {
                    if (!errS && rez.rowCount > 0) req.session.utilizator = rez.rows[0];
                    res.render("pagini/profil", { raspuns: "Date salvate cu succes!", err: "" });
                });
        });
    });
});

// [etapa8] pagina admin utilizatori - tabel Bootstrap, acces doar admin
app.get("/utilizatori", function(req, res) {
    if (!req.utilizator || !req.utilizator.areDreptul(Drepturi.vizualizareUtilizatori)) {
        res.render("pagini/utilizatori", { useri: [], err: "Acces interzis!" });
        return;
    }
    Utilizator.getToti(function(err, rez) {
        let useri = err ? [] : rez.rows.filter(u => u.id !== req.utilizator.id);
        res.render("pagini/utilizatori", { useri, err: "" });
    });
});

// [etapa8] sterge utilizator (admin) - sterge din BD + folder poze + email "adio"
app.post("/sterge_utiliz", function(req, res) {
    if (!req.utilizator || !req.utilizator.areDreptul(Drepturi.stergereUtilizatori)) {
        res.redirect("/"); return;
    }
    let idUtiliz = parseInt(req.body ? req.body.id_utiliz : null);
    let formular = new formidable.IncomingForm();
    formular.parse(req, function(err, f) {
        let id = parseInt(f.id_utiliz ? f.id_utiliz[0] : 0);
        AccesBD.getInstanta().select({ tabel: "utilizatori", campuri: ["*"], conditiiAnd: [`id=${id}`] },
            function(errS, rez) {
                if (errS || rez.rowCount === 0) { res.redirect("/utilizatori"); return; }
                let u = new Utilizator(rez.rows[0]);
                u.trimiteMail("Cont șters AdoptHub", "Cu sincera parere de rau, va anuntam ca ati fost sters! Adio",
                    "<p>Cu sinceră părere de rău, vă anunțăm că ați fost șters! Adio</p>");
                let folderUser = path.join(__dirname, "poze_uploadate", u.username);
                if (fs.existsSync(folderUser)) fs.rmSync(folderUser, { recursive: true });
                AccesBD.getInstanta().delete({ tabel: "utilizatori", conditiiAnd: [`id=${id}`] },
                    function() { res.redirect("/utilizatori"); });
            });
    });
});

// [etapa8] administrare animale (admin) - adauga/sterge animale
app.get("/administrare", function(req, res) {
    if (!req.utilizator || !req.utilizator.areDreptul(Drepturi.adaugareAnimal)) {
        res.render("pagini/administrare", { animale: [], err: "Acces interzis!" });
        return;
    }
    client.query("SELECT * FROM animal ORDER BY id", function(err, rez) {
        res.render("pagini/administrare", { animale: err ? [] : rez.rows, err: "", raspuns: "" });
    });
});

app.post("/administrare", function(req, res) {
    if (!req.utilizator || !req.utilizator.areDreptul(Drepturi.adaugareAnimal)) {
        res.redirect("/"); return;
    }
    let formular = new formidable.IncomingForm();
    formular.parse(req, function(err, f) {
        let actiune = f.actiune ? f.actiune[0] : "";
        if (actiune === "sterge") {
            let id = parseInt(f.id ? f.id[0] : 0);
            client.query("DELETE FROM animal WHERE id=$1", [id], function() {
                res.redirect("/administrare");
            });
        } else if (actiune === "adauga") {
            client.query(
                "INSERT INTO animal(nume, specie, descriere) VALUES($1, $2, $3)",
                [f.nume ? f.nume[0] : "", f.specie ? f.specie[0] : "altele", f.descriere ? f.descriere[0] : ""],
                function() { res.redirect("/administrare"); }
            );
        } else {
            res.redirect("/administrare");
        }
    });
});

// [etapa8] stergere cont - verificare parola + sterge BD + folder + email la revedere
app.post("/sterge_cont", function(req, res) {
    if (!req.utilizator) { res.redirect("/"); return; }
    let utilizatorul = req.utilizator;
    let formular = new formidable.IncomingForm();
    formular.parse(req, function(err, f) {
        let parola = f.parola ? f.parola[0] : "";
        if (Utilizator.criptareParola(parola, utilizatorul.salt || "adopthub") !== utilizatorul.parola) {
            req.session.mesajLogin = "Parola incorectă! Contul nu a fost șters.";
            res.redirect("/profil");
            return;
        }
        let utiliz = new Utilizator(utilizatorul);
        utiliz.trimiteMail("La revedere de la AdoptHub", "Contul tau a fost sters. La revedere!",
            "<p>Contul tău pe <strong>AdoptHub</strong> a fost șters. La revedere!</p>");
        let folder = path.join(__dirname, "poze_uploadate", utilizatorul.username);
        if (fs.existsSync(folder)) fs.rmSync(folder, { recursive: true });
        AccesBD.getInstanta().delete({ tabel: "utilizatori", conditiiAnd: [`id=${utilizatorul.id}`] },
            function() {
                req.session.destroy();
                res.redirect("/");
            });
    });
});

// Ruta generică — trebuie să fie ultima
app.get("/*splat", function(req, res) {
    if (req.url.startsWith("/resurse") && path.extname(req.url) === "") {
        afisareEroare(res, 403);
        return;
    }
    if (path.extname(req.url) === ".ejs") {
        afisareEroare(res, 400);
        return;
    }
    res.render("pagini" + req.url, function(err, rezRandare) {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res);
            }
        } else {
            res.send(rezRandare);
        }
    });
});

const port = process.env.PORT || 8080; // It will use the CMD variable or default to 8080
app.listen(port);
console.log(`Serverul a pornit pe portul ${port}!`);
