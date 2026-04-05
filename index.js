const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("view engine", "ejs");

console.log("Folder index.js (__dirname):", __dirname);
console.log("Cale fișier (__filename):", __filename);
console.log("Folder curent de lucru (process.cwd()):", process.cwd());
// __dirname și process.cwd() nu sunt întotdeauna același lucru.
// __dirname = folderul fișierului index.js; process.cwd() = folderul din care a fost pornit Node.

obGlobal = {
    obErori: null,
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

// IP disponibil în toate paginile
app.use(function(req, res, next) {
    res.locals.ip = req.ip;
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

app.get(["/", "/index", "/home"], function(req, res) {
    res.render("pagini/index");
});

app.get("/despre", function(req, res) {
    res.render("pagini/despre");
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

app.listen(8080);
console.log("Serverul a pornit pe portul 8080!");
