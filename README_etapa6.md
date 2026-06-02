# AdoptHub — Etapa 6

Acest document explică unde și cum a fost implementată fiecare cerință rezolvată din Etapa 6.

---

## (0.05) Corectare linkuri meniu

**Fișier:** `views/fragmente/header.ejs:28-35`

Submeniul „Animale" este generat dinamic pe baza enumului `specie_enum` din baza de date. Valorile posibile ale enumului sunt preluate prin server (`speciiDisponibile`) și transmise în `locals` la fiecare request, astfel că meniul reflectă întotdeauna categoriile reale din BD:

```ejs
<li>
    <a href="/animale">Toate</a>
</li>
<% for (let sp of (locals.speciiDisponibile || [])) { %>
    <li><a href="/animale?specie=<%= sp %>"><%= (locals.numeSpecii || {})[sp] || sp %></a></li>
<% } %>
```

---

## (1.2p) Afișare + sortare/filtrare/calculare `[format-entitati]`

### Baza de date — tabelul `animal`

**Fișier:** `resurse/sql/setup_adopthub_web.sql:4-30`

```sql
CREATE DATABASE adopthub_web;
CREATE USER adopthub_web WITH PASSWORD 'adopthub2025';

CREATE TYPE specie_enum AS ENUM ('caine', 'pisica', 'iepure', 'hamster', 'altele');

CREATE TABLE animal (
    id                SERIAL PRIMARY KEY,
    nume              VARCHAR(80)  NOT NULL,
    descriere         TEXT,
    cale_imagine      VARCHAR(200),
    specie            specie_enum  NOT NULL,       -- categorie mare (enum, max 5 valori)
    talie             VARCHAR(15)  NOT NULL,        -- subcategorie (mica/medie/mare/foarte_mare)
    varsta_luni       INTEGER      NOT NULL,        -- caracteristica numerica 1
    nivel_energie     INTEGER      NOT NULL,        -- caracteristica numerica 2 (1–10)
    data_inregistrare DATE         NOT NULL,        -- caracteristica date
    culoare           VARCHAR(20)  NOT NULL,        -- caracteristica cu o singura valoare string
    trasaturi         VARCHAR(300),                 -- caracteristica cu mai multe valori (virgula-separator)
    vaccinat          BOOLEAN      NOT NULL         -- caracteristica booleana
);
GRANT SELECT, INSERT, UPDATE, DELETE ON animal TO adopthub_web;
GRANT USAGE, SELECT ON SEQUENCE animal_id_seq TO adopthub_web;
```

Coloanele `locatie` și `adapost` au fost adăugate ulterior:

**Fișier:** `resurse/sql/alter_animal_add_locatie.sql:7-9`

```sql
ALTER TABLE animal
    ADD COLUMN IF NOT EXISTS locatie VARCHAR(50) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS adapost VARCHAR(100) NOT NULL DEFAULT '';
```

Tabelul conține **18 entități** cu caracteristici diversificate (specii, talii, vârste, culori, trăsături etc.) — `setup_adopthub_web.sql:32-50`.

---

### ORM Sequelize — `module_proprii/sequelize.js:37-52`

```js
Animal = Sequelize.define("animal", {
    id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nume:              DataTypes.STRING,
    varsta_luni:       DataTypes.INTEGER,
    nivel_energie:     DataTypes.INTEGER,
    talie:             DataTypes.STRING,
    culoare:           DataTypes.STRING,
    trasaturi:         DataTypes.STRING,
    data_inregistrare: DataTypes.DATEONLY,
    vaccinat:          DataTypes.BOOLEAN,
    cale_imagine:      DataTypes.STRING,
    descriere:         DataTypes.TEXT,
    specie:            DataTypes.STRING,
    locatie:           DataTypes.STRING,
    adapost:           DataTypes.STRING
}, { timestamps: false, tableName: "animal" });
```

---

### Meniu — împărțire pe categorii mari

Valorile enumului `specie_enum` sunt preluate din BD și transmise în `locals` prin middleware — `index.js` (middleware global). La click pe o subcategorie din meniu, se trimite `?specie=<valoare>` și serverul filtrează la nivel de BD:

**Fișier:** `index.js:560-600`

```js
app.get("/animale", async function(req, res) {
    let specie = req.query.specie;
    let where = {};
    if (specie) where.specie = specie;
    let animale = await Animal.findAll({ where, order: [["id", "ASC"]] });
    // ... statistici Bonus 1 ...
    res.render("pagini/animale", { animale: animale.map(a => a.dataValues), specieSelectata: specie || "toate", ... });
});
```

---

### Format afișare produse — `views/pagini/animale.ejs:158-195`

Fiecare animal este un `<article>` cu:
- `id="elem_<id>"` (cerința privind id-ul)
- clase: `card animal <specie> <talie>` (categorie ca clasă CSS, fără spații)
- `data-*` atribute pentru filtrare/sortare client
- tabel cu 2 coloane: nume caracteristică → valoare
- imagine în dreapta tabelului (flexbox)
- `<time>` cu format românesc: `15 Septembrie 2018 (Sâmbătă)`
- descriere sub tabel, categorie (specie) sub descriere

```ejs
<article id="elem_<%= a.id %>" class="card animal <%= a.specie %> <%= a.talie %>"
         data-nume="<%= a.nume %>" data-varsta="<%= a.varsta_luni %>"
         data-energie="<%= a.nivel_energie %>" data-talie="<%= a.talie %>"
         data-trasaturi="<%= a.trasaturi %>" data-data="<%= a.data_inregistrare %>"
         data-vaccinat="<%= a.vaccinat %>" data-specie="<%= a.specie %>"
         data-locatie="<%= a.locatie || '' %>">
    <div class="card-body">
        <h3 class="card-title"><a href="/animal/<%= a.id %>"><%= a.nume %></a></h3>
        <div class="continut-animal">
            <table>
                <tr><td>Vârstă</td><td><%= a.varsta_luni %> luni</td></tr>
                <tr><td>Nivel energie</td><td><%= a.nivel_energie %>/10</td></tr>
                <tr><td>Talie</td><td><%= a.talie.replace('_', ' ') %></td></tr>
                <tr><td>Culoare</td><td><%= a.culoare %></td></tr>
                <tr><td>Trăsături</td><td><%= a.trasaturi %></td></tr>
                <tr><td>Înregistrat</td><td><time ...><%= formateazaData(a.data_inregistrare) %></time></td></tr>
                <tr><td>Vaccinat</td><td><%= a.vaccinat ? 'da' : 'nu' %></td></tr>
            </table>
            <img src="/resurse/imagini/animale/<%= a.cale_imagine %>" ...>
        </div>
        <p class="descriere card-text"><%= a.descriere %></p>
        <p class="categorie-animale">Specie: <span class="val-specie"><%= a.specie %></span></p>
    </div>
</article>
```

Grid afișare — `resurse/scss/animale.scss:12-25`:

```scss
#grid-animale {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    @media (max-width: 900px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (max-width: 560px) { grid-template-columns: 1fr; }
}
```

---

### Pagina produs unic — `views/pagini/animal.ejs`

Generată automat pentru fiecare animal via `GET /animal/:id`. Afișează toate detaliile (inclusiv `locatie`, `adapost`) și setează un cookie cu ultimul animal vizitat:

**Rută:** `index.js:612-628`

```js
app.get("/animal/:id", async function(req, res) {
    let id = parseInt(req.params.id);
    let animal = await Animal.findByPk(id);
    let similare = await Animal.findAll({
        where: { specie: animal.specie, id: { [Op.ne]: id } }, limit: 3
    });
    res.render("pagini/animal", { animal: animal.dataValues, similare: similare.map(s => s.dataValues) });
});
```

---

### Filtre — `views/pagini/animale.ejs:17-148` + `resurse/js/animale.js:108-153`

Secțiunea de filtre conține toate cele 8 tipuri de input cerute:

| Input | Filtru aplicat | Locație EJS |
|-------|---------------|-------------|
| `text` | Nume animal (parțial, insensibil diacritice) | linia 23 |
| `range` | Nivel energie minim (step=1, min/max din BD) | liniile 32-37 |
| `datalist` | Locație (opțiuni din BD) | liniile 44-56 |
| `radio` (grup) | Vaccinat: Toate / Da / Nu | liniile 79-85 |
| `checkbox` | Înregistrat în ultimul an | liniile 91-94 |
| `textarea` | Trăsături (cuvinte-cheie, virgulă-separator) | liniile 100-105 |
| `select` simplu | Talie (oricare / mica / medie / mare / foarte_mare) | liniile 62-73 |
| `select` multiplu | Specii (Ctrl+click, toate selectate inițial) | liniile 110-115 |

Funcția de filtrare client-side — `animale.js:108-153`:

```js
function filtreaza() {
    for (let prod of document.getElementsByClassName("animal")) {
        let cond = true;
        if (valNume    && !norm(prod.dataset.nume).includes(norm(valNume)))             cond = false;
        if (valLocatie && !norm(prod.dataset.locatie || "").includes(norm(valLocatie))) cond = false;
        if (parseInt(prod.dataset.energie) < energieMin)                               cond = false;
        if (vaccinat !== "toate") {
            let vac = prod.dataset.vaccinat === "true" ? "da" : "nu";
            if (vac !== vaccinat) cond = false;
        }
        if (cbRecent.checked && new Date(prod.dataset.data) < acumMinus1An)            cond = false;
        if (cuvinte.length > 0 && !cuvinte.some(c => norm(prod.dataset.trasaturi || "").includes(norm(c))))
                                                                                        cond = false;
        if (selTalie.value !== "oricare" && prod.dataset.talie !== selTalie.value)     cond = false;
        if (speciiSelectate.length > 0 && !speciiSelectate.includes(prod.dataset.specie))
                                                                                        cond = false;
        prod.dataset.passFilter = cond ? "1" : "0";
    }
    if (cbSalveaza.checked) salveazaFiltre();
    afiseazaPagina(1);
}
```

---

### Sortare — `animale.js:170-182`

Două chei de sortare:
1. **Cheia 1:** raport `nivel_energie / varsta_luni` (energie relativă la vârstă)
2. **Cheia 2 (pentru egalitate):** talie (mica=1, medie=2, mare=3, foarte_mare=4)

```js
function sorteaza(semn) {
    let vProduse = Array.from(document.getElementsByClassName("animal"));
    vProduse.sort(function(a, b) {
        let enA = parseInt(a.dataset.energie), varA = parseInt(a.dataset.varsta) || 1;
        let enB = parseInt(b.dataset.energie), varB = parseInt(b.dataset.varsta) || 1;
        let diff = semn * ((enA / varA) - (enB / varB));
        if (Math.abs(diff) > 0.0001) return diff;
        return semn * ((talieOrd[a.dataset.talie] || 0) - (talieOrd[b.dataset.talie] || 0));
    });
    let container = document.getElementById("grid-animale");
    for (let prod of vProduse) container.appendChild(prod);
    afiseazaPagina(paginaCurenta);
}
```

---

### Calcul — `animale.js:187-201`

Calculează media vârstei (în luni) a animalelor vizibile și o afișează 2 secunde într-un `div` cu poziție fixă creat dinamic:

```js
document.getElementById("btn-calcul").onclick = function() {
    let suma = 0, nr = 0;
    for (let prod of document.getElementsByClassName("animal")) {
        if (prod.style.display !== "none") { suma += parseInt(prod.dataset.varsta); nr++; }
    }
    if (nr === 0) { alert("Nu există animale vizibile."); return; }
    let div = document.createElement("div");
    div.id = "div-calcul";
    div.innerHTML = `Media vârstei: <strong>${(suma / nr).toFixed(1)} luni</strong> (${nr} animale)`;
    document.body.appendChild(div);
    setTimeout(function() { div.remove(); }, 2000);
};
```

Stilizare `div-calcul` — `animale.scss:136-147`: poziție `fixed`, `bottom: 2rem; right: 2rem`.

---

### Resetare — `animale.js:215-239`

La click pe „Resetare", un `confirm()` întreabă utilizatorul dacă dorește cu adevărat resetarea. La OK, toate filtrele revin la valorile inițiale, ordinea inițială este restaurată și `localStorage` este șters:

```js
document.getElementById("btn-reset").onclick = function() {
    if (!confirm("Resetezi toate filtrele?")) return;
    // resetare toate inputuri la valorile implicite
    // restaurare ordine inițială din DOM
    // ștergere localStorage
    afiseazaPagina(1);
};
```

---

### Validare inputuri — `animale.js:25-46`

Validare la click pe orice buton de acțiune (filtrare/sortare/calculare):

```js
function valideazaNume() {
    let ok = val === "" || /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(val);
    inpNume.classList.toggle("is-invalid", !ok);
    return ok;
}
function valideazaTrasaturi() {
    let ok = val === "" || /^[a-zA-ZăâîșțĂÂÎȘȚ\s,]+$/.test(val);
    taTrasaturi.classList.toggle("is-invalid", !ok);
    return ok;
}
```

La eșec, inputul primește clasa Bootstrap `is-invalid` și se afișează `invalid-feedback`.

---

## (0.3p) Stilizare inputuri Bootstrap

**Fișier principal:** `views/pagini/animale.ejs:117-145`

### Butoane cu icoane (Bootstrap Icons), text ascuns pe ecran mic

```ejs
<button id="btn-filtrare" class="btn btn-primary btn-sm">
    <i class="bi bi-funnel-fill"></i>
    <span class="d-none d-md-inline"> Filtrează</span>
</button>
<button id="btn-sort-asc" class="btn btn-secondary btn-sm">
    <i class="bi bi-sort-up-alt"></i>
    <span class="d-none d-md-inline"> Sortare ↑</span>
</button>
```

Pe ecran mic (< `md` = 700px), clasa `d-none d-md-inline` ascunde textul; rămân doar icoanele.

### Radio/Checkbox ca toggle buttons — `animale.ejs:78-95`

```ejs
<div class="btn-group btn-group-sm" role="group">
    <input type="radio" class="btn-check" name="gr-vaccinat" id="vac-toate" value="toate" checked>
    <label class="btn btn-outline-primary" for="vac-toate">Toate</label>
    <input type="radio" class="btn-check" name="gr-vaccinat" id="vac-da" value="da">
    <label class="btn btn-outline-primary" for="vac-da">Da</label>
    ...
</div>

<input type="checkbox" class="btn-check" id="cb-recent">
<label class="btn btn-outline-secondary btn-sm" for="cb-recent">
    <i class="bi bi-clock-history"></i> Înregistrat în ultimul an
</label>
```

### Floating label textarea — `animale.ejs:100-105`

```ejs
<div class="form-floating">
    <textarea class="form-control" id="ta-trasaturi" ...></textarea>
    <label for="ta-trasaturi">Trăsături (cuvinte cheie, virgulă-separator)</label>
    <div class="invalid-feedback">...</div>
</div>
```

Floating label-ul devine `is-invalid` via JavaScript la eroare de validare.

### Grid Bootstrap pentru inputuri — `animale.ejs:18-147`

```ejs
<div class="row g-2 align-items-start">
    <div class="col-12 col-md-6"> ... </div>
    <div class="col-12 col-md-6"> ... </div>
    ...
</div>
```

### Range slider customizat — `resurse/scss/custom.scss:51-55`

```scss
$form-range-thumb-width:  1.5rem,   // 50% mai mare față de 1rem (font-size html)
$form-range-thumb-height: 1.5rem,
$form-range-thumb-bg:     #c96b43,  // culoare principală AdoptHub
$form-range-track-bg:     #e8bca8,
```

### Switch temă în header — `views/fragmente/header.ejs:2-8`

```ejs
<div id="wrapper-tema">
    <select id="sel-tema" aria-label="Alege tema">
        <option value="light">&#9728; Luminos</option>
        <option value="dark">&#9790; Întunecat</option>
        <option value="nature">&#127807; Natură</option>
    </select>
</div>
```

---

## (0.2p) Teme light/dark cu variabile CSS + localStorage

### Variabile CSS — `resurse/scss/tema.scss`

Trei teme definite prin `data-tema` pe `<html>`:

**Temă light (implicită)** — `tema.scss:1-5`:
```scss
:root {
    --culoare-text: #3a2c23; --culoare-accent: #c96b43;
    --culoare-fundal: #faf5f0; --culoare-fundal-secundar: #ecdfd1;
    --culoare-border: #c8a888; --culoare-highlight: #5c8a6a;
}
```

**Temă dark** — `html[data-tema="dark"]`, `tema.scss:7-58`:
```scss
html[data-tema="dark"] {
    --culoare-text: #e8ddd4; --culoare-accent: #e8895a;
    --culoare-fundal: #1a1210; --culoare-fundal-secundar: #2a1f1a;
    // suprascrie și variabilele Bootstrap pentru consistență
}
```

**Temă nature** — `html[data-tema="nature"]`, `tema.scss:68-89`:
```scss
html[data-tema="nature"] {
    --culoare-text: #1b5e20; --culoare-accent: #2e7d32;
    --culoare-fundal: #f1f8e9; --culoare-fundal-secundar: #dcedc8;
}
```

Tranziție lină între teme — `tema.scss:61-65`:
```scss
@media (min-width: 700px) {
    *, *::before, *::after {
        transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }
}
```

### Persistare localStorage — `resurse/js/tema.js`

```js
var tema = localStorage.getItem("tema") || "light";
document.documentElement.dataset.tema = tema;   // aplicat imediat, înainte de DOMContentLoaded

document.addEventListener("DOMContentLoaded", function() {
    var sel = document.getElementById("sel-tema");
    if (!sel) return;
    sel.value = tema;
    sel.onchange = function() {
        document.documentElement.dataset.tema = this.value;
        localStorage.setItem("tema", this.value);
    };
});
```

Tema e aplicată **imediat** (înainte de render) pentru a evita flash of unstyled content.

---

## Bonus 1 (0.8p) — Atribute inputuri generate din baza de date

**Server:** `index.js:567-597` — query raw SQL pentru statistici:

```js
let rows = await orm.getSequelize().query(
    `SELECT MIN(nivel_energie) min_e, MAX(nivel_energie) max_e,
            COUNT(*) FILTER (WHERE vaccinat=true)  nr_vac,
            COUNT(*) FILTER (WHERE vaccinat=false) nr_nevac,
            COUNT(*) FILTER (WHERE data_inregistrare >= CURRENT_DATE - INTERVAL '1 year') nr_recent
     FROM animal`,
    { type: QueryTypes.SELECT }
);
```

**Template:** `animale.ejs`

| Input | Atribut generat din BD | Linie |
|-------|------------------------|-------|
| `range` energie | `min`, `max`, `value` din `stats.min_e` / `stats.max_e` | 33-36 |
| radio vaccinat | labels cu contoare `nr_vac` / `nr_nevac` | 82-84 |
| checkbox recent | label cu contor `nr_recent` | 93 |
| select talie | opțiuni din `DISTINCT talie` | 64-71 |
| datalist locatie | opțiuni din `DISTINCT locatie` | 46-55 |
| select multiplu specii | opțiuni din `speciiDisponibile` (enum) | 111-114 |
| input text nume | `maxlength="80"` din schema `VARCHAR(80)` | 23 |
| textarea trăsături | `maxlength="300"` din schema `VARCHAR(300)` | 101 |

---

## Bonus 2 (0.15p) — 3 teme

Implementate în `resurse/scss/tema.scss`:
- **Light** (implicită) — paletă caldă/bej
- **Dark** — paletă rece/închisă cu contrast ajustat
- **Nature** — paletă verde (#2e7d32)

---

## Bonus 3 (0.05p) — Mesaj când nu există rezultate

**Fișier:** `views/pagini/animale.ejs:153` + `resurse/js/animale.js:94`

```ejs
<p id="msg-gol" style="display:none" class="text-muted fst-italic">
    Nu există animale conform filtrării curente.
</p>
```

```js
document.getElementById("msg-gol").style.display = vizibile.length === 0 ? "" : "none";
```

---

## Bonus 4 (0.4p) — onchange pe toate cele 8 inputuri

**Fișier:** `resurse/js/animale.js:160-168`

```js
inpNume.addEventListener("input", filtreaza);
inpEnergie.addEventListener("input", filtreaza);
inpLocatie.addEventListener("input", filtreaza);
selTalie.addEventListener("change", filtreaza);
selSpecie.addEventListener("change", filtreaza);
cbRecent.addEventListener("change", filtreaza);
taTrasaturi.addEventListener("input", filtreaza);
for (let r of document.getElementsByName("gr-vaccinat")) r.addEventListener("change", filtreaza);
```

---

## Bonus 5 (0.5p) — Paginare

**Fișier:** `resurse/js/animale.js:83-105`

K=6 animale per pagină. Butoane de navigare generate dinamic, pagina activă cu `btn-primary`, restul cu `btn-outline-primary`:

```js
const K = 6;
function afiseazaPagina(p) {
    let vizibile = cards.filter(c => c.dataset.passFilter !== "0");
    for (let c of cards) c.style.display = "none";
    let start = (p - 1) * K;
    for (let i = start; i < Math.min(start + K, vizibile.length); i++)
        vizibile[i].style.display = "";
    let nrPag = Math.ceil(vizibile.length / K);
    for (let i = 1; i <= nrPag; i++) {
        let btn = document.createElement("button");
        btn.className = "btn btn-sm " + (i === p ? "btn-primary" : "btn-outline-primary");
        // ...
    }
}
```

---

## Bonus 7 (0.15p) — Căutare insensibilă la diacritice

**Fișier:** `resurse/js/animale.js:6-8`

```js
function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
```

Aplicată la: căutare după nume (linia 129), locație (linia 130) și trăsături (linia 142).

---

## Bonus 11 (0.4p) — Modal Bootstrap la click pe card

**Fișier:** `views/pagini/animale.ejs:198-213` + `resurse/js/animale.js:241-259`

La click pe orice card (dar nu pe un link/buton din interior), se populează și se deschide un modal Bootstrap cu datele principale ale animalului + link spre pagina completă:

```js
card.addEventListener("click", function(e) {
    if (e.target.closest("a,button")) return;
    document.getElementById("modal-body").innerHTML = `
        <table class="table table-sm">
          <tr><td>Vârstă</td><td>${this.dataset.varsta} luni</td></tr>
          ...
        </table>`;
    new bootstrap.Modal(document.getElementById("modal-animal")).show();
});
```

Stilizare modal cu culori din schema site — `animale.scss:128-133`:

```scss
#modal-animal {
    .modal-header { background: var(--culoare-accent); color: #fff; }
    .modal-footer { background: var(--culoare-fundal-secundar); }
}
```

---

## Bonus 15 (0.05p) — Contor animale afișate

**Fișier:** `views/pagini/animale.ejs:151` + `resurse/js/animale.js:93`

```ejs
<p>Animale afișate: <strong id="nr-animale"><%= locals.animale ? animale.length : 0 %></strong></p>
```

```js
document.getElementById("nr-animale").textContent = vizibile.length;
```

Se actualizează la fiecare filtrare/paginare.

---

## Bonus 16 (0.3p) — Animale similare (pe pagina produs unic)

**Server:** `index.js:618-626`

```js
let similare = await Animal.findAll({
    where: { specie: animal.specie, id: { [Op.ne]: id } },
    limit: 3
});
```

**Template:** `views/pagini/animal.ejs:40-54`

```ejs
<% if (locals.similare && similare.length > 0) { %>
<section class="animale-similare">
    <h3>Animale similare</h3>
    <div class="similar-grid">
        <% for (let s of similare) { %>
        <a href="/animal/<%= s.id %>" class="similar-card">
            <img src="/resurse/imagini/animale/<%= s.cale_imagine %>" alt="<%= s.nume %>">
            <strong><%= s.nume %></strong>
            <span><%= s.talie.replace('_',' ') %>, <%= s.varsta_luni %> luni</span>
        </a>
        <% } %>
    </div>
</section>
<% } %>
```

**Stil:** `animale.scss:97-126` — flexbox `.similar-grid` + carduri 130px cu imagine, nume, talie+vârstă.

---

## Bonus 18 (0.2p) — Produse noi cu badge „NOU" + listare pe prima pagină

### Detecție și badge

**Logică:** `views/pagini/animale.ejs:159` + `views/pagini/animal.ejs:13`

```ejs
<% let eNou = new Date() - new Date(a.data_inregistrare) <= 365*24*60*60*1000; %>
<% if (eNou) { %><span class="badge-nou">NOU</span><% } %>
```

**Stil badge** — `resurse/scss/animale.scss:79-95`:

```scss
.badge-nou {
    position: absolute;
    top: 0.5rem; left: 0.5rem;
    background: #e53935;
    color: #fff;
    font-size: 0.7rem; font-weight: 700;
    padding: 0.15rem 0.45rem;
    border-radius: 4px; letter-spacing: 0.05em;
    z-index: 1;
}
```

### Secțiune pe prima pagină

**Server:** `index.js:481-488`

```js
let rows = await Animal.findAll({
    where: { data_inregistrare: { [Op.gte]: new Date(Date.now() - 365*24*60*60*1000) } },
    order: [["data_inregistrare", "DESC"]],
    limit: 5
});
animaleNoi = rows.map(a => a.dataValues);
```

**Template:** `views/pagini/index.ejs:123-143` — secțiunea `#animale-noi`, lista `ul.lista-animale-noi` cu link, imagine și info sumar per animal.

**Stil** — `resurse/scss/custom.scss:196-220`:

```scss
#animale-noi {
    .lista-animale-noi {
        list-style: none;
        display: flex; flex-wrap: wrap; gap: 0.75rem;
        li a {
            display: flex; align-items: center; gap: 0.75rem;
            background: var(--culoare-fundal-secundar);
            border: 1px solid var(--culoare-border);
            border-radius: 8px; padding: 0.5rem 0.75rem;
            img { width: 60px; height: 50px; object-fit: cover; }
        }
    }
}
```
