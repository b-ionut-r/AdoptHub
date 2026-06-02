# AdoptHub — Etapa 5

Acest document explică unde și cum a fost implementată fiecare cerință rezolvată din Etapa 5.

---

## (0.35) Galeria statică `[efect-css-galerie-statica]`

### Structura JSON — `resurse/json/galerie.json`

JSON-ul are proprietatea `cale_galerie` (calea folderului cu imagini) și tabloul `imagini`, fiecare element conținând:
```json
{
  "cale_imagine": "contact-uman.jpg",
  "titlu": "Primul contact",
  "descriere": "Câinele adulmecă mâna omului ...",
  "timp": "08:00-18:00",
  "alt": "câine care adulmecă o mână",
  "atribuirie": { "autor": "Pexels", "sursa": "https://...", "licenta": "CC0" }
}
```

### Încărcare JSON — `index.js:195-198`

```js
function initGalerie() {
    let continut = fs.readFileSync(path.join(__dirname, "resurse/json/galerie.json")).toString("utf-8");
    obGlobal.obGalerie = JSON.parse(continut);
}
```

### Filtrare după ora serverului — `index.js:351-389`

Funcția `esteInInterval(oraCurentaMinute, interval)` verifică dacă ora curentă (în minute) se află între `HH:MM-HH:MM`. Suportă și intervale care trec peste miezul nopții (ex: `"22:00-06:00"`):

```js
function esteInInterval(oraCurentaMinute, interval) {
    let [inceput, sfarsit] = interval.split("-");
    let minuteInceput = minuteDinTextOra(inceput);
    let minuteSfarsit = minuteDinTextOra(sfarsit);

    if (minuteInceput <= minuteSfarsit) {
        return oraCurentaMinute >= minuteInceput && oraCurentaMinute <= minuteSfarsit;
    } else {
        // interval care trece peste miezul nopții
        return oraCurentaMinute >= minuteInceput || oraCurentaMinute <= minuteSfarsit;
    }
}
```

### Generare variante responsive — `index.js:395-419`

La fiecare cerere a galeriei, serverul verifică dacă există deja versiunile redimensionate; dacă nu, le creează folosind pachetul `sharp`:

```js
async function genereazaVarianteGalerie() {
    let variante = [
        { folder: "mediu", latime: 360, inaltime: 240 },
        { folder: "mic",   latime: 240, inaltime: 160 }
    ];
    for (let imagine of obGlobal.obGalerie.imagini) {
        for (let varianta of variante) {
            let caleImagineVarianta = path.join(caleGalerie, varianta.folder, imagine.cale_imagine);
            if (!fs.existsSync(caleImagineVarianta)) {
                fs.mkdirSync(path.dirname(caleImagineVarianta), { recursive: true });
                await sharp(caleImagineMare)
                    .resize(varianta.latime, varianta.inaltime, { fit: "cover", position: "attention" })
                    .toFile(caleImagineVarianta);
            }
        }
    }
}
```

### Construire obiect galerie — `index.js:425-447`

Funcția `obtineGalerie()` filtrează imaginile, le trunchiază la maxim 10 și adaugă căile web:

```js
async function obtineGalerie() {
    await genereazaVarianteGalerie();
    let infoOra = obtineOraCurentaGalerie();

    let imagini = obGlobal.obGalerie.imagini
        .filter(imagine => esteInInterval(infoOra.minute, imagine.timp))
        .slice(0, 10)   // trunchiere la 10
        .map(imagine => ({
            ...imagine,
            alt_final: imagine.alt || path.parse(imagine.cale_imagine).name,
            title_final: `${imagine.titlu}. ${imagine.descriere}`,
            sursa_mare:  `${caleGalerieWeb}/${imagine.cale_imagine}`,
            sursa_mediu: `${caleGalerieWeb}/mediu/${imagine.cale_imagine}`,
            sursa_mica:  `${caleGalerieWeb}/mic/${imagine.cale_imagine}`
        }));

    return { ora_curenta: infoOra.text, imagini };
}
```

### Rute Express — `index.js:473-516`

Galeria apare pe **pagina principală** (`/`) și pe **pagina dedicată** (`/galerie` sau `/galerie-statica`):

```js
app.get(["/", "/index", "/home"], async function(req, res) {
    res.render("pagini/index", { galerie: await obtineGalerie(), ... });
});

app.get(["/galerie", "/galerie-statica"], async function(req, res) {
    res.render("pagini/galerie", { galerie: await obtineGalerie(), ... });
});
```

### Template EJS — fără duplicare cod

Codul HTML al galeriei este scris o singură dată în `views/fragmente/galerie-statica.ejs` și inclus în ambele pagini:

```ejs
<%- include('../fragmente/galerie-statica.ejs') %>
```

### Template galerie — `views/fragmente/galerie-statica.ejs`

```ejs
<div id="grid-galerie">
    <% galerie.imagini.forEach(function(imagine) { %>
    <figure>
        <picture>
            <source media="(max-width: 700px)"  srcset="<%= imagine.sursa_mica %>">
            <source media="(max-width: 1000px)" srcset="<%= imagine.sursa_mediu %>">
            <img src="<%= imagine.sursa_mare %>"
                 alt="<%= imagine.alt_final %>"
                 title="<%= imagine.title_final %>">
        </picture>
        <figcaption>
            <span class="titlu-galerie"><%= imagine.titlu %></span>
            <span class="descriere-galerie"><%= imagine.descriere %></span>
            <span class="interval-galerie">Vizibil intre <%= imagine.timp %></span>
            <% if (imagine.atribuirie) { %>
            <span class="credit-galerie">
                Credit foto: <a href="<%= imagine.atribuirie.sursa %>"><%= imagine.atribuirie.autor %></a>
                (<%= imagine.atribuirie.licenta %>)
            </span>
            <% } %>
        </figcaption>
    </figure>
    <% }) %>
</div>
```

### CSS galerie — `general.css:336-477`

Grid 4 coloane pe ecran mare, 2 pe ecran mediu, 1 pe ecran mic:

```css
#grid-galerie {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 1.15rem 1rem;
    counter-reset: litera-galerie;
}
/* Ecran mediu */
@media (max-width: 1000px) {
    #grid-galerie { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    #grid-galerie figure { grid-column: auto !important; grid-row: auto !important; }
}
/* Ecran mic */
@media (max-width: 700px) {
    #grid-galerie { grid-template-columns: 1fr; }
}
```

Indexare cu litere (a, b, c…) prin CSS counter:

```css
#grid-galerie figure { counter-increment: litera-galerie; }
#grid-galerie .titlu-galerie::before {
    content: counter(litera-galerie, lower-alpha) ". ";
    color: var(--culoare-accent);
}
```

Tranziția la hover (1.25s, scale 30%, figcaption schimbă culoarea):

```css
#grid-galerie img {
    transform-origin: center bottom;
    transition: transform 1.25s ease, box-shadow 1.25s ease;
}
#grid-galerie figure:hover img {
    transform: scale(1.3);
}
#grid-galerie figcaption {
    transition: background-color 1.25s ease, color 1.25s ease;
}
#grid-galerie figure:hover figcaption {
    background-color: var(--culoare-highlight);
    color: var(--culoare-fundal);
}
```

---

## (0.25) Compilare automată SCSS

### Pregătire cadru de lucru — `index.js:52-66`

Proprietățile `folderScss` și `folderCss` sunt definite în obiectul global:

```js
obGlobal = {
    obErori: null,
    obGalerie: null,
    folderScss: path.join(__dirname, "resurse", "scss"),  // linia 55
    folderCss:  path.join(__dirname, "resurse", "css"),   // linia 56
};
```

Folderul `backup` este creat automat la pornire (alături de `temp`, `logs`, `fisiere_uploadate`):

```js
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let caleFull = path.join(__dirname, folder);
    if (!fs.existsSync(caleFull)) {
        fs.mkdirSync(caleFull, { recursive: true });
    }
}
```

### Funcția `compileazaScss(caleScss, caleCss)` — `index.js:303-334`

Funcția acceptă căi relative sau absolute. Dacă `caleCss` lipsește, deduce numele din SCSS:

```js
function compileazaScss(caleScss, caleCss) {
    // Căi relative → absolute față de folderScss/folderCss
    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }
    if (!caleCss) {
        let numeFisier = path.parse(caleScss).name + ".css";   // ex: animale.css
        caleCss = path.join(obGlobal.folderCss, numeFisier);
    } else if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }
    // ... backup + compilare
}
```

### Salvare în backup — `index.js:314-325`

Înainte de suprascrierea CSS-ului, versiunea veche este copiată în `backup/resurse/css/` cu timestamp în nume (Bonus 3):

```js
if (fs.existsSync(caleCss)) {
    let infoFisier = path.parse(caleCss);
    let timestamp  = Date.now();
    let numeFisier = `${infoFisier.name}_${timestamp}${infoFisier.ext}`; // ex: animale_1779621666145.css
    let caleBackup = path.join(__dirname, "backup", "resurse", "css", numeFisier);
    try {
        fs.mkdirSync(path.dirname(caleBackup), { recursive: true });
        fs.copyFileSync(caleCss, caleBackup);
    } catch (err) {
        console.error(`EROARE la backup ${numeFisier}:`, err.message);
    }
}
```

### Compilare propriu-zisă — `index.js:327-333`

```js
try {
    let result = sass.compile(caleScss);
    fs.writeFileSync(caleCss, result.css);
    console.log(`SCSS compilat: ${path.basename(caleScss)} → ${path.basename(caleCss)}`);
} catch (err) {
    console.error(`EROARE la compilarea SCSS ${path.basename(caleScss)}:`, err.message);
}
```

### Compilare inițială la pornire — `index.js:336-338`

La pornirea serverului, toate fișierele SCSS din `folderScss` sunt compilate:

```js
fs.readdirSync(obGlobal.folderScss)
    .filter(f => f.endsWith(".scss"))
    .forEach(f => compileazaScss(f));
```

### Compilare pe parcurs cu `fs.watch` — `index.js:340-344`

Orice fișier SCSS creat sau modificat în folder este recompilat automat:

```js
fs.watch(obGlobal.folderScss, function(eventType, filename) {
    if (filename && filename.endsWith(".scss")) {
        compileazaScss(filename);
    }
});
```

---

## (0.25) Customizare Bootstrap — `resurse/scss/custom.scss`

Fișierul importă Bootstrap și suprascrie variabilele folosind sintaxa `@use ... with (...)`:

```scss
@use '../../node_modules/bootstrap/scss/bootstrap' with (
    // Familie de font implicită
    $font-family-sans-serif: ("Nunito", sans-serif),

    // Culori teme (schema cromatică AdoptHub)
    $primary:    #c96b43,   // portocaliu teracotă
    $secondary:  #5c8a6a,   // verde adăpost
    $light:      #faf5f0,
    $dark:       #3a2c23,
    $body-bg:    #faf5f0,
    $body-color: #3a2c23,

    // Culori font
    $link-color:       #c96b43,
    $link-hover-color: #5c8a6a,
    $headings-color:   #3a2c23,

    // Raze border
    $border-radius:    6px,
    $border-radius-sm: 4px,
    $border-radius-lg: 8px,
    $border-radius-xl: 12px,

    // Dimensiuni headinguri
    $h1-font-size: 2rem,
    $h2-font-size: 1.6rem,
    $h3-font-size: 1.35rem,
    $h4-font-size: 1.15rem,
    $h5-font-size: 1rem,
    $h6-font-size: 0.875rem,

    // Breakpointuri — md: 700px, lg: 1000px (diferite de cele implicite Bootstrap)
    $grid-breakpoints: (
        xs: 0, sm: 480px, md: 700px, lg: 1000px, xl: 1200px, xxl: 1400px
    ),

    // Variabile suplimentare alese
    $form-range-thumb-width:  1.5rem,
    $form-range-thumb-height: 1.5rem,
    $form-range-thumb-bg:     #c96b43,
    $form-range-track-bg:     #e8bca8,
    $btn-border-width:        2px,
);
```

Cele două teme ilustrate prin variabile Bootstrap + CSS custom sunt:
- **Temă light (implicită)** — culorile de mai sus aplicate prin Bootstrap
- **Temă dark** — suprascrisă în `resurse/scss/tema.scss` prin variabile CSS custom (`--bs-body-bg`, `--bs-body-color` etc.)
- **Temă nature (verde)** — `resurse/scss/tema.scss`, variabile CSS custom cu verde (#2e7d32, #f1f8e9)

### Corectare Bootstrap — `custom.scss:66-95`

Bootstrap resetează unele stiluri; regulile de mai jos restaurează aspectul inițial al site-ului:

```scss
img {
    width: 68%; min-width: 200px; max-width: 100%; height: auto;
}
table {
    border-collapse: separate; border-spacing: 0;
}
header nav ul {
    list-style: disc inside; padding: 0; margin: 0;
}
a[href^="http"]::before {
    content: "⮳"; font-size: 1.5em; margin-right: 0.15em;
}
```

CSS-ul Bootstrap este inclus primul (prin `<link rel="stylesheet" href="/resurse/css/custom.css">` în `views/fragmente/head.ejs`, înaintea celorlalte foi de stil), asigurând că stilurile proprii îl suprascriu.

Compilarea se face automat la pornirea serverului prin `compileazaScss("custom.scss")`.

---

## (0.25) Efecte CSS

### Text pe coloane (0.025) — `general.css:701-712`

Secțiunea de text introductiv din pagina principală (`#intro > section`) este afișată pe 3 coloane pe ecran mare, cu linie despărțitoare între ele. Pe ecran mediu/mic se afișează o singură coloană:

```css
#intro > section {
    column-count: 3;
    column-gap: 1.5rem;
    column-rule: 1px solid var(--culoare-border);
}
@media (max-width: 1000px) {
    #intro > section { column-count: 1; }
}
```

### Schimbarea afișării textului selectat (0.025) — `general.css:694-698`

Se schimbă culoarea de fundal și cea a textului la selecție, folosind variabilele schemei cromatice (2 proprietăți modificate):

```css
::selection {
    background-color: var(--culoare-accent);   /* portocaliu */
    color: var(--culoare-fundal);              /* bej deschis */
}
```

### Text defilant (0.05) — `general.css:715-733`

`#banner-defilare` are `overflow: hidden` (nu apare scrollbar orizontal). Span-ul interior are `white-space: nowrap` și este animat să se deplaseze de la dreapta la stânga, continuu:

```css
#banner-defilare {
    overflow: hidden;
}
#banner-defilare span {
    display: inline-block;
    white-space: nowrap;
    animation: defilare 22s linear infinite;
}
@keyframes defilare {
    from { transform: translateX(100vw); }
    to   { transform: translateX(-100%); }
}
```

### Background-attachment fix cu animație (0.05) — `general.css:736-757`

`#fundal-fix` are imaginea de fundal fixă la scroll (`background-attachment: fixed`). Imaginea se schimbă automat prin animație după 12 secunde (t=12s ales):

```css
#fundal-fix {
    background-attachment: fixed;
    background-size: cover;
    animation: schimbaFundal 12s linear infinite;
}
@keyframes schimbaFundal {
    0%  { background-image: url('/resurse/imagini/woman-petting-adorable-dog.jpg'); }
    34% { background-image: url('/resurse/imagini/max-mare.jpg'); }
    67% { background-image: url('/resurse/imagini/luna.jpg'); }
}
```

### Tabel responsive (0.05) — `general.css:607-613, 660-669`

Tabelul cu adăposturi partenere (5 coloane, fără rowspan/colspan) este învelit într-un `div.tabel-container`. Pe ecrane mici/medii apare scroll orizontal:

```css
.tabel-container {
    overflow-x: auto;
}
.tabel-container table {
    min-width: 760px;
}
```

HTML în `views/pagini/index.ejs`:
```html
<div class="tabel-container">
    <table> <!-- 5 coloane: Adăpost, Localitate, Program, Animale, Grad ocupare --> </table>
</div>
```

### Tabel transpus (0.025) — `general.css:797-840`

Tabelul `#transpus` din pagina **Despre** (`views/pagini/despre.ejs`) este afișat normal pe ecran mare și mic, dar se transpune (coloanele devin rânduri) **numai pe ecran mediu** (700-1000px):

```css
@media (min-width: 700px) and (max-width: 1000px) {
    #tabel-adoptat #transpus thead,
    #tabel-adoptat #transpus tbody,
    #tabel-adoptat #transpus tr {
        display: block;
        float: left;       /* elementele stau unul lângă altul → transpunere */
    }
    #tabel-adoptat #transpus th,
    #tabel-adoptat #transpus td {
        display: block;    /* fiecare celulă pe linie proprie în coloana sa */
        white-space: nowrap;
    }
}
```

### Stilizare HR (0.1) `[efect-css-stilizare-hr]` — `general.css:859-888` + `custom.scss:157-186`

Sunt implementate **două clase** de HR stilizat, amândouă folosind `::before` și `::after` pentru simboluri poziționate pe linie:

**`hr.hr-decorat`** (folosit în paginile cu text):
```css
hr.hr-decorat {
    position: relative;
    width: min(78%, 28rem);
    border: none;
    border-top: 0.18rem solid var(--culoare-highlight);  /* verde */
    overflow: visible;
}
hr.hr-decorat::before,
hr.hr-decorat::after {
    content: "\2733";           /* simbolul ✳ */
    position: absolute;
    top: 50%; transform: translateY(-50%);
    font-size: 1.15rem;
    color: var(--culoare-highlight);
}
hr.hr-decorat::before { right: calc(100% + 0.4rem); }  /* în stânga liniei */
hr.hr-decorat::after  { left:  calc(100% + 0.4rem); }  /* în dreapta liniei */
```

**`hr.hr-stelute`** (folosit în `custom.scss`, compilat via SASS):
```scss
hr.hr-stelute {
    border: none;
    height: 3px;
    background-color: $primary;     /* portocaliu din schema cromatică */
    position: relative;
    overflow: visible;
    width: 60%;

    &::before, &::after {
        content: "⭐";
        position: absolute;
        top: 50%; transform: translateY(-50%);
        background-color: $body-bg;  /* ascunde linia din spatele stelei */
        padding: 0 0.5rem;
    }
    &::before { left: 20%; }
    &::after  { right: 20%; }
}
```

---

## Bonus 1 (0.5) — Galeria animată `[galerie-animata]`

### Selecție imagini — `index.js:212-233`

Sunt selectate imaginile de pe pozițiile **impare** (1, 3, 5…) din JSON. Numărul final este par, ales aleatoriu între 6 și 14:

```js
function obtineImaginiGalerieAnimata() {
    let imaginiEligibile = obGlobal.obGalerie.imagini.filter((_, index) => (index + 1) % 2 === 1);
    let nrMaxim = Math.floor(Math.min(14, imaginiEligibile.length) / 2) * 2;  // par, max 14
    let nrMinim = Math.min(6, nrMaxim);
    let nrPosibilitati = (nrMaxim - nrMinim) / 2 + 1;
    let nrImagini = Math.floor(Math.random() * nrPosibilitati) * 2 + nrMinim;  // par, [6-14]
    // ...
}
```

### Compilare CSS dinamic — `index.js:518-533`

La fiecare cerere a paginii `/galerie-dinamica`, CSS-ul galerie este regenarat din template-ul SCSS EJS cu numărul curent de imagini:

```js
app.get("/galerie-dinamica", async function(req, res) {
    let galerieAnimata = obtineImaginiGalerieAnimata();
    compileazaScssDinTemplate(
        path.join(__dirname, "resurse", "scss_ejs", "galerie_animata.scss"),
        path.join(__dirname, "resurse", "css", "galerie-animata.css"),
        { nrImagini: galerieAnimata.nr_imagini }
    );
    res.render("pagini/galerie-dinamica", {
        galerieAnimata,
        timestampCss: Date.now()   // cache-busting
    });
});
```

Funcția `compileazaScssDinTemplate` (`index.js:241-247`) randează template-ul EJS, scrie SCSS-ul generat în `temp/`, apoi apelează `compileazaScss` care face și backup-ul CSS-ului anterior.

### Template SCSS EJS — `resurse/scss_ejs/galerie_animata.scss`

Numărul de imagini vine din EJS (`<%= nrImagini %>`), iar SASS calculează delay-urile și keyframe-urile:

```scss
$nrimag: <%= nrImagini %>;
$durata-imagine: 3s;
$durata-totala: $nrimag * $durata-imagine;

// Delay per imagine (calculat cu @for)
@for $i from 1 through $nrimag {
    #galerie-animata figure:nth-of-type(#{$i}) {
        animation-delay: -($nrimag - $i + 1) * $durata-imagine;
    }
}
```

### Animație clip-path — `resurse/scss_ejs/galerie_animata.scss:72-114`

Trecerea între imagini se face prin `clip-path: polygon(...)` — imaginea curentă este „decupată" de-a lungul diagonalei secundare, micșorând zona vizibilă spre colțurile din stânga-sus și dreapta-jos:

```scss
$p: 100% / $nrimag;  // procentul dintr-un ciclu cât este vizibilă o imagine

@keyframes galerie-animata {
    0% {
        opacity: 1; z-index: 10;
        clip-path: polygon(0 0, 100% 0, 0 100%, 0 0, 100% 100%, 100% 0, 0 100%, 100% 100%);
    }
    #{$p} {
        opacity: 1; z-index: 10;
        /* Trecere completă — zona vizibilă colapsează spre colțuri */
        clip-path: polygon(0 0, 0 0, 0 0, 0 0, 100% 100%, 100% 100%, 100% 100%, 100% 100%);
    }
    #{$p + 0.001%} {
        opacity: 0; z-index: -10;  /* dispare imediat după trecere */
    }
    /* ... reintră la finalul ciclului */
    100% {
        opacity: 1; z-index: 0;
        clip-path: polygon(0 0, 100% 0, 0 100%, 0 0, 100% 100%, 100% 0, 0 100%, 100% 100%);
    }
}
```

### Border-image — `resurse/scss_ejs/galerie_animata.scss:11-23`

```scss
#galerie-animata {
    border: 18px solid transparent;
    border-image-source: url('/resurse/imagini/galerie/portret-caine.jpg');
    border-image-slice: 32;
    border-image-repeat: round;
}
```

### Oprire la hover și ascundere pe ecran mic — `galerie_animata.scss:60-68, 116-120`

```scss
#galerie-animata:hover figure {
    animation-play-state: paused;
}
@media (max-width: 1000px) {
    #sectiune-galerie-animata { display: none; }
}
```

### HTML — `views/pagini/galerie-dinamica.ejs`

```ejs
<div id="galerie-animata" aria-label="Galerie animată AdoptHub">
    <% galerieAnimata.imagini.forEach(function(imagine) { %>
        <figure>
            <picture>
                <source media="(max-width: 1000px)" srcset="<%= imagine.sursa_mediu %>">
                <img src="<%= imagine.sursa %>" alt="<%= imagine.alt_final %>"
                     title="<%= imagine.title_final %>">
            </picture>
            <figcaption><%= imagine.titlu %></figcaption>
        </figure>
    <% }) %>
</div>
```

---

## Bonus 3 (0.05) — Timestamp în numele fișierelor backup

Fișierele salvate în backup au timestamp în nume, permițând păstrarea mai multor versiuni — `index.js:315-318`:

```js
let timestamp  = Date.now();
let numeFisier = `${infoFisier.name}_${timestamp}${infoFisier.ext}`;
// ex: animale_1779621666145.css
```

---

## Bonus 4 (0.025) — Compilare corectă pentru fișiere cu puncte în nume

Problema din codul dat la curs: pentru `stil.frumos.scss`, metodele bazate pe `split(".")` ar extrage doar `stil` ca bază. Corecția folosește `path.parse()` care extrage corect `name` și `ext` — `index.js:308`:

```js
let numeFisier = path.parse(caleScss).name + ".css";
// path.parse("stil.frumos.scss") → { name: "stil.frumos", ext: ".scss" }
// rezultat: "stil.frumos.css" ✓
```

---

## Bonus 5 (0.025 + 0.025) — Verificare date galerie.json

Funcția `verificaDateGalerie()` este apelată la pornirea serverului (`index.js:295`) și afișează erori detaliate în consolă:

### Verificare folder `cale_galerie` (0.025) — `index.js:274-277`

```js
let caleFolderGalerie = path.join(__dirname, galerie.cale_galerie);
if (!fs.existsSync(caleFolderGalerie) || !fs.statSync(caleFolderGalerie).isDirectory()) {
    console.error(`EROARE GALERIE: Folderul specificat în "cale_galerie" nu există: ${caleFolderGalerie}`);
}
```

### Verificare imagini inexistente (0.025) — `index.js:284-292`

```js
galerie.imagini.forEach((imagine, index) => {
    if (!imagine.cale_imagine) {
        console.error(`EROARE GALERIE: Imaginea de pe poziția ${index} nu are proprietatea "cale_imagine".`);
        return;
    }
    let caleImagine = path.join(caleFolderGalerie, imagine.cale_imagine);
    if (!fs.existsSync(caleImagine)) {
        console.error(`EROARE GALERIE: Fișierul imagine "${imagine.cale_imagine}" (poziția ${index}) nu există: ${caleImagine}`);
    }
});
```
