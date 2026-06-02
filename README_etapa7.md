# AdoptHub — Etapa 7 (format_fisiere_upload)

Cerința acoperă: galerie de imagini gestionată printr-un fișier JSON, redimensionare automată cu Sharp, galerie dinamică cu SCSS generat din template EJS, filtrare după interval orar, validare structură JSON la pornire.

---

## galerie.json — structura fișierului de configurare

**Fișier:** `resurse/json/galerie.json`

Fiecare imagine din galerie are:
```json
{
  "cale_imagine": "caine-culcat.jpg",
  "titlu": "...",
  "descriere": "...",
  "timp": "08:00-22:00",
  "alt": "...",
  "atribuire": "Photo by X (CC BY 2.0)"
}
```
- `timp` — intervalul orar în care imaginea este afișată (suportă trecere miezul nopții: `"22:00-06:00"`)
- `atribuire` — credit foto; dacă lipsește, nu se afișează

---

## Inițializare galerie + validare JSON

**Fișier:** `index.js:249-295` (funcțiile `initGalerie`, `verificaDateGalerie`)

`verificaDateGalerie()` — rulată la pornirea serverului, verifică:
- existența fișierului `galerie.json`
- prezența proprietăților `cale_galerie` și `imagini`
- existența efectivă pe disc a fiecărui fișier imagine listtat

```js
galerie.imagini.forEach((imagine, index) => {
    let caleImagine = path.join(caleFolderGalerie, imagine.cale_imagine);
    if (!fs.existsSync(caleImagine)) {
        console.error(`EROARE GALERIE: Fișierul imagine "${imagine.cale_imagine}" nu există`);
    }
});
```

`initGalerie()` — citește JSON-ul în `obGlobal.obGalerie` la pornire.

---

## Sharp — variante imagini (mediu, mic)

**Fișier:** `index.js:482-508` (funcția `genereazaVarianteGalerie`)

La fiecare request pe galerie se generează automat (dacă nu există deja) două variante mai mici ale fiecărei imagini:

| Variantă | Folder | Lățime | Înălțime |
|----------|--------|--------|----------|
| mediu | `galerie/mediu/` | 360px | 240px |
| mic | `galerie/mic/` | 240px | 160px |

```js
await sharp(caleImagineMare)
    .resize(varianta.latime, varianta.inaltime, { fit: "cover", position: "attention" })
    .toFile(caleImagineVarianta);
```

- `fit: "cover"` — imaginea e tăiată pentru a umple exact dimensiunile
- `position: "attention"` — Sharp detectează automat zona de interes (față, subiect)

---

## Filtrare galerie după ora curentă

**Fișier:** `index.js:430-452` (funcțiile `obtineOraCurentaGalerie`, `esteInInterval`)

La fiecare request se citește ora serverului și se selectează doar imaginile al căror interval `timp` include ora curentă:

```js
function esteInInterval(oraCurentaMinute, interval) {
    let [inceput, sfarsit] = interval.split("-");
    let minuteInceput = minuteDinTextOra(inceput);
    let minuteSfarsit = minuteDinTextOra(sfarsit);
    if (minuteInceput <= minuteSfarsit) {
        return oraCurentaMinute >= minuteInceput && oraCurentaMinute <= minuteSfarsit;
    } else {
        // interval trece peste miezul noptii (ex: 22:00-06:00)
        return oraCurentaMinute >= minuteInceput || oraCurentaMinute <= minuteSfarsit;
    }
}
```

Rezultatul este trunchiat la max 10 imagini (`slice(0, 10)`).

---

## Galerie dinamică — SCSS generat din template EJS

**Fișier server:** `index.js:268-290` + `index.js:298-307` + `index.js:608-618`

### Selecție imagini — `obtineImaginiGalerieAnimata()` (linia 268)

Selectează un număr par aleatoriu de imagini (între 6 și 14) din imaginile de pe poziții pare (0-based):
```js
let nrImagini = nrMinim + Math.floor(Math.random() * ((nrMaxim - nrMinim) / 2 + 1)) * 2;
```

### Compilare SCSS din template — `compileazaScssDinTemplate()` (linia 298)

```js
function compileazaScssDinTemplate(caleScssTemplate, caleCss, dateTemplate) {
    let continutTemplate = fs.readFileSync(caleScssTemplate).toString("utf-8");
    let continutScss = ejs.render(continutTemplate, dateTemplate);  // injecteaza nrImagini
    fs.writeFileSync(caleScssTemp, continutScss);
    compileazaScss(caleScssTemp, caleCss);  // compileaza SCSS → CSS
}
```

### Ruta galerie dinamică (linia 608)

```js
app.get("/galerie-dinamica", async function(req, res) {
    let galerieAnimata = obtineImaginiGalerieAnimata();
    compileazaScssDinTemplate(
        "resurse/scss_ejs/galerie_animata.scss",
        "resurse/css/galerie-animata.css",
        { nrImagini: galerieAnimata.nr_imagini }
    );
    res.render("pagini/galerie-dinamica", { galerieAnimata, timestampCss: Date.now() });
});
```

`timestampCss: Date.now()` — forțează browser-ul să nu cache-uiască CSS-ul, deoarece se regenerează la fiecare request.

### Template SCSS-EJS — `resurse/scss_ejs/galerie_animata.scss`

Fișierul conține cod SCSS normal + tag-uri EJS (`<%= nrImagini %>`). EJS este procesat mai întâi (înlocuiește `nrImagini` cu valoarea reală), apoi SCSS este compilat în CSS. Permite generarea de `nth-child` selectori dinamici pentru animații.

### View — `views/pagini/galerie-dinamica.ejs`

Linkul CSS include timestamp:
```ejs
<link rel="stylesheet" href="/resurse/css/galerie-animata.css?v=<%= timestampCss %>">
```

---

## erori.json — gestionare erori HTTP

**Fișier:** `resurse/json/erori.json` + `index.js:172-195` (funcția `afisareEroare`)

La pornire, `initErori()` citește `erori.json` în `obGlobal.obErori`. Funcția `afisareEroare(res, identificator)` caută eroarea după cod și randează `pagini/eroare.ejs` cu titlu + text + imagine:

```js
function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = obGlobal.obErori.info_erori.find(elem => elem.identificator == identificator);
    let errDefault = obGlobal.obErori.eroare_default;
    res.render("pagini/eroare", {
        imagine: imagine || eroare?.imagine || errDefault.imagine,
        titlu: titlu || eroare?.titlu || errDefault.titlu,
        text: text || eroare?.text || errDefault.text,
    });
}
```

Erori definite: 404 (Not Found), 403 (Forbidden), 400 (Bad Request), eroare generică implicită.

---

## Rute galerie

**Fișier:** `index.js:596-618`

| Rută | Fișier randat |
|------|---------------|
| `GET /galerie` sau `/galerie-statica` | `pagini/galerie.ejs` |
| `GET /galerie-dinamica` | `pagini/galerie-dinamica.ejs` |

Ambele folosesc `await obtineGalerie()` care filtrează după oră și generează variantele sharp.
