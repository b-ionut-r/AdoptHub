const express = require("express");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const sharp = require("sharp");
const sass = require("sass");
const pg = require("pg");

const app = express();
app.set("view engine", "ejs");

const client = new pg.Client({
    database: "adopthub_web",
    user: "adopthub_web",
    password: "adopthub2025",
    host: "localhost",
    port: 5432
});
client.connect(function(err) {
    if (err) console.error("Eroare conectare BD:", err.message);
    else console.log("Conectat la baza de date adopthub_web.");
});

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
};

// Creare foldere necesare
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let caleFull = path.join(__dirname, folder);
    if (!fs.existsSync(caleFull)) {
        fs.mkdirSync(caleFull, { recursive: true });
    }
}

// Folder static
app.use("/resurse", express.static(path.join(__dirname, "resurse")));
app.use("/dist", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));

// IP și date globale disponibile în toate paginile
app.use(function(req, res, next) {
    res.locals.ip = req.ip;
    res.locals.speciiDisponibile = speciiDisponibile;
    res.locals.numeSpecii = numeSpecii;
    res.locals.formateazaData = formateazaData;
    res.locals.caleCurenta = req.path;
    next();
});

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

function initGalerie() {
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");
    obGlobal.obGalerie = JSON.parse(continut);
}

function obtineCaleWebGalerie() {
    return "/" + obGlobal.obGalerie.cale_galerie.replace(/\\/g, "/").replace(/^\/+/, "");
}

function obtineImaginiGalerieAnimata() {
    let imaginiEligibile = obGlobal.obGalerie.imagini.filter((_, index) => (index + 1) % 2 === 1);
    let nrMaxim = Math.floor(Math.min(14, imaginiEligibile.length) / 2) * 2;
    let nrMinim = Math.min(6, nrMaxim);
    let nrImagini = 0;
    if (nrMaxim >= nrMinim && nrMaxim > 0) {
        let nrPosibilitati = (nrMaxim - nrMinim) / 2 + 1;
        nrImagini = Math.floor(Math.random() * nrPosibilitati) * 2 + nrMinim;
    }
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

function compileazaScssDinTemplate(caleScssTemplate, caleCss, dateTemplate) {
    let continutTemplate = fs.readFileSync(caleScssTemplate).toString("utf-8");
    let continutScss = ejs.render(continutTemplate, dateTemplate);
    let caleScssTemp = path.join(__dirname, "temp", path.parse(caleScssTemplate).name + ".generated.scss");
    fs.writeFileSync(caleScssTemp, continutScss);
    compileazaScss(caleScssTemp, caleCss);
}

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
        console.error("EROARE GALERIE: Proprietatea \"imagini\" trebuie să fie un tablou în galerie.json.");
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

function minuteDinTextOra(textOra) {
    let [ore, minute] = textOra.split(":").map(elem => parseInt(elem, 10));
    return ore * 60 + minute;
}

function obtineOraCurentaGalerie() {
    // Pentru verificare se poate inlocui temporar cu o data fixa.
    let dataCurenta = new Date();
    let ore = String(dataCurenta.getHours()).padStart(2, "0");
    let minute = String(dataCurenta.getMinutes()).padStart(2, "0");
    return {
        minute: dataCurenta.getHours() * 60 + dataCurenta.getMinutes(),
        text: `${ore}:${minute}`
    };
}

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
        res.render("pagini/index", {
            galerie: await obtineGalerie(),
            afiseazaLinkGalerie: true
        });
    } catch (err) {
        console.error(err);
        afisareEroare(res);
    }
});

app.get("/despre", function(req, res) {
    res.render("pagini/despre");
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

app.get("/animale", function(req, res) {
    let specie = req.query.specie;
    let comanda, parametri;
    if (specie) {
        comanda = "SELECT * FROM animal WHERE adoptat=false AND specie=$1::specie_enum ORDER BY id";
        parametri = [specie];
    } else {
        comanda = "SELECT * FROM animal WHERE adoptat=false ORDER BY id";
        parametri = [];
    }
    client.query(comanda, parametri, function(err, rez) {
        if (err) { afisareEroare(res); return; }
        res.render("pagini/animale", {
            animale: rez.rows,
            specieSelectata: specie || "toate"
        });
    });
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
