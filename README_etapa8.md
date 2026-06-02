# AdoptHub — Etapa 8 (sistem_utilizatori)

Ctrl+F după tag-urile `[etapa8]` din cod pentru a găsi rapid fiecare cerință.

---

## Baza de date — tabelul `utilizatori`

**Fișier:** `resurse/sql/add_utilizatori.sql`

```sql
CREATE TABLE utilizatori (
    id               SERIAL PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    nume             VARCHAR(100) NOT NULL,
    prenume          VARCHAR(100) NOT NULL,
    email            VARCHAR(200) NOT NULL,
    parola           VARCHAR(500) NOT NULL,      -- scrypt hex, lungimeCod=64 bytes → 128 chars
    data_nasterii    DATE,
    data_inregistrare TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    culoare_chat     VARCHAR(50)  NOT NULL DEFAULT 'black',
    rol              VARCHAR(20)  NOT NULL DEFAULT 'comun',
    ocupatie         VARCHAR(100),
    cale_imagine     VARCHAR(300),               -- cale relativa: poze_uploadate/username/fisier
    cod              VARCHAR(300),               -- token confirmare email
    confirmat_mail   BOOLEAN      NOT NULL DEFAULT FALSE,
    salt             VARCHAR(50),                -- [bonus] salt unic per utilizator
    ultima_logare    TIMESTAMP                   -- [bonus] timestamp ultima autentificare
);
```

Roluri (setat manual în BD pentru admini): `comun` (default), `moderator`, `admin`.

---

## Baza de date — tabelul `accesari`

**Fișier:** `resurse/sql/add_utilizatori.sql`

```sql
CREATE TABLE accesari (
    id              SERIAL PRIMARY KEY,
    user_id         INT NULL REFERENCES utilizatori(id) ON DELETE CASCADE,
    pagina          VARCHAR(500) NOT NULL,
    data_accesare   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Folosit pentru: tracking acces pagini utilizatori logați, calcul utilizatori online.

---

## Pachete noi instalate

**Fișier:** `package.json`

```
express-session   — gestiune sesiuni HTTP (cookie de sesiune pe client)
formidable        — parsare formulare multipart/form-data (upload fișiere)
```

Importate în `index.js:7-8`:
```js
const session = require("express-session");
const formidable = require("formidable");
```

---

## Sesiune + middleware global

**Fișier:** `index.js:99` (session) + `index.js:107-148` (middleware global)

```js
app.use(session({ secret: "adopthub2025", resave: true, saveUninitialized: false }));
```

Middleware-ul global (`[etapa8] middleware global` în cod) rulează la **orice** request și:
1. Pune `req.session.utilizator` în `res.locals.utilizator` (disponibil în toate EJS-urile)
2. Construiește `res.locals.utilizatoriOnline` (query pe accesari, ultimele 10 min)
3. Setează `res.locals.afiseazaAvertisment` (bonus data modificare)
4. Inserează un rând în `accesari` pentru userul logat
5. Expune `Drepturi` în locals pentru verificări în EJS

---

## Formular înregistrare

**Fișier view:** `views/pagini/inregistrare.ejs`

Câmpuri (toate cu `name` exact ca în tabel):

| Câmp | Input | Required |
|------|-------|----------|
| username | text, `pattern="[A-Za-z0-9#_./]+"` | da |
| nume | text | da |
| prenume | text | da |
| parola | password | da |
| rparola | password | da (doar client) |
| email | email | da |
| data_nasterii | date | nu |
| culoare_chat | color | nu |
| ocupatie | select (8 opțiuni) | nu |
| cale_imagine | file, `accept="image/*"` | nu |

Form: `method="post" action="/inregistrare" enctype="multipart/form-data"`

---

## Validare client — `resurse/js/inregistrare.js`

Tag în cod: `[etapa8] validare client formular inregistrare`

```js
// 1. campuri required prezente
// 2. parola === rparola (doar client)
// 3. regex nume/prenume: /^[A-Za-zÀ-ÿĀ-ſ\s-]+$/ (litere, spatii, liniouta)
// 4. email format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// 5. parola >= 6 caractere
```

La eroare: `ev.preventDefault()` + afișare mesaj în `#mesaj-eroare-client`.

---

## POST /inregistrare — validare server + upload + email

**Fișier:** `index.js:726-787` — tag `[etapa8] inregistrare utilizator`

**Flux:**
1. `formidable.on("field")` — capturează `username` timpuriu (necesar pentru folder upload)
2. `formidable.on("fileBegin")` — setează `fisier.filepath = poze_uploadate/{username}/{originalFilename}`, creează folderul dacă nu există
3. `formular.parse()` callback — validări server-side identice cu cele client:
   - câmpuri required, regex nume/prenume, email format, parolă >= 6 chars
4. `Utilizator.getUtilizDupaUsername()` — verifică dacă username există deja
5. Dacă OK: `utiliz.salvareUtilizator()` (inserează în BD, trimite email)

**Upload poză:**
```js
formular.on("fileBegin", function(name, fisier) {
    if (name === "cale_imagine" && fisier.originalFilename) {
        let folder = path.join(__dirname, "poze_uploadate", username || "tmp");
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        fisier.filepath = path.join(folder, fisier.originalFilename);
        cale_imagine = `poze_uploadate/${username}/${fisier.originalFilename}`;
    }
});
```

---

## salvareUtilizator() — parolă criptată + token + email "Cont nou"

**Fișier:** `module_proprii/utilizator.js` — tag `[etapa8] salvare utilizator in BD`

```js
let salt = parole.genereazaToken(16);              // [bonus] salt unic aleatoriu
let parolaCriptata = Utilizator.criptareParola(this.parola, salt);  // scrypt(parola, salt, 64)
let token = Utilizator.genereazaToken(this.username);
```

**Email trimis la înregistrare** (subiect: "Cont nou"):
```
Bine ai venit în comunitatea AdoptHub.
Username-ul tău este: <strong style="color:green">username</strong>
[link confirmare]
```

---

## Format token confirmare

**Fișier:** `module_proprii/utilizator.js` — tag `[etapa8] token confirmare`

```js
static genereazaToken(username) {
    // 4 litere aleatoare (a-z sau A-Z)
    let prefix = ...4 litere random din "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"...
    // scrypt(username, domeniu, 20) → 40 chars hex, non-alfanumerice → '0'
    let hash = crypto.scryptSync(username, Utilizator.numeDomeniu, 20)
                     .toString("hex").replace(/[^A-Za-z0-9]/g, "0");
    return prefix + hash;  // total ~44 chars
}
```

URL-ul de confirmare: `http://localhost:8080/confirmare/{username}/{token}`

---

## GET /confirmare/:username/:token — validare link email

**Fișier:** `index.js:820-836` — tag `[etapa8] confirmare email`

```js
if (u.cod !== req.params.token) {
    res.render("pagini/confirmare", { ok: false });
    return;
}
AccesBD.getInstanta().update({ campuri: { confirmat_mail: true }, conditiiAnd: [`id=${u.id}`] }, ...);
```

Dacă token-ul NU corespunde cu `cod` din BD → `ok: false` → pagina afișează eroare.
Dacă corespunde → `confirmat_mail = true` → utilizatorul se poate loga.

---

## POST /login — autentificare

**Fișier:** `index.js:789-813` — tag `[etapa8] login`

```js
let parolaCriptata = Utilizator.criptareParola(ob.parola, u.salt || "adopthub");
if (u.parola === parolaCriptata && u.confirmat_mail) {
    ob.req.session.utilizator = u;  // stochează userul în sesiune
    client.query("UPDATE utilizatori SET ultima_logare=NOW() WHERE id=$1", [u.id]);
    ob.res.redirect("/");
} else if (u.parola === parolaCriptata && !u.confirmat_mail) {
    ob.req.session.mesajLogin = "Nu ai confirmat adresa de e-mail! Verifică căsuța poștală.";
}
```

- Parola este comparată cu hash-ul din BD folosind salt-ul propriu al utilizatorului
- Dacă `confirmat_mail = false`, login blocat cu mesaj explicit

---

## GET /logout

**Fișier:** `index.js:815-818` — tag `[etapa8] logout`

```js
req.session.destroy();
res.redirect("/");
```

Distruge sesiunea → userul este delogat → header arată din nou formularul de login.

---

## Formular login în header

**Fișier:** `views/fragmente/header.ejs` — tag `[etapa8] formular login in header`

```ejs
<% if (!locals.utilizator) { %>
    <form method="post" action="/login" enctype="multipart/form-data" id="form-login">
        <input type="text" name="username" required>
        <input type="password" name="parola" required>
        <input type="submit" value="Autentificare">
    </form>
<% } else { %>
    <strong><%= locals.utilizator.nume %> <%= locals.utilizator.prenume %></strong>
    <a href="/logout" title="logout">&#128682;</a>  <!-- iconița ușiță -->
<% } %>
```

Meniul admin (Utilizatori, Administrare) — tag `[etapa8] meniu admin in header`:
```ejs
<% if (locals.utilizator.areDreptul && locals.utilizator.areDreptul(locals.Drepturi.vizualizareUtilizatori)) { %>
    <li><a href="/utilizatori">Utilizatori</a></li>
    <li><a href="/administrare">Administrare</a></li>
<% } %>
```

---

## Prima pagină — salut utilizator

**Fișier:** `views/pagini/index.ejs` (~linia 95-102, secțiunea `#comunitate`)

```ejs
<% if (locals.utilizator) { %>
    <img src="/<%- locals.utilizator.cale_imagine || 'resurse/imagini/user-default.png' %>"
         style="width:80px;height:80px;object-fit:cover;border-radius:50%">
    <p>Bine ai venit, <strong><%= locals.utilizator.username %></strong>!</p>
    <% if (locals.utilizator.ultima_logare) { %>
        <p>Ultima logare: <%= locals.formateazaData(locals.utilizator.ultima_logare) %></p>
    <% } %>
<% } %>
```

Poza default (`user-default.png`) — generată cu Sharp la pornire.

---

## GET + POST /profil — pagina de profil

**Fișier:** `index.js:840-895` — tag `[etapa8] profil`

**View:** `views/pagini/profil.ejs`

- Câmpul `username` este setat `readOnly = true` prin JavaScript la `DOMContentLoaded`
- Câmpurile sunt prepopulate din `locals.utilizator` prin JavaScript
- **Orice modificare necesită parola curentă** (câmpul `parola_curenta`, required)
- Parola nouă este opțională; dacă e completată, se generează salt nou și se recriptează
- Noua poză se salvează ca `poze_uploadate/{username}/poza.png` (suprascrie vechea poză)
- La salvare reușită: email cu noile date (pe adresa nouă dacă s-a schimbat)

---

## GET /utilizatori — pagina admin

**Fișier:** `index.js:899-908` — tag `[etapa8] pagina admin utilizatori`

**View:** `views/pagini/utilizatori.ejs`

- Acces condiționat: `req.utilizator.areDreptul(Drepturi.vizualizareUtilizatori)` (rol admin)
- Adminul curent este EXCLUS din tabel: `rez.rows.filter(u => u.id !== req.utilizator.id)`
- Tabel Bootstrap cu 3 clase: `table table-striped table-hover table-bordered`
- Coloane: Nume, Prenume, Username, E-mail, buton Șterge

---

## POST /sterge_utiliz — ștergere utilizator (admin)

**Fișier:** `index.js:910-930` — tag `[etapa8] sterge utilizator`

```js
// 1. Caută userul după ID transmis prin hidden input
// 2. Trimite email: "Cu sinceră părere de rău, vă anunțăm că ați fost șters! Adio"
// 3. Șterge folderul de poze: fs.rmSync(folderUser, { recursive: true })
// 4. Șterge rândul din BD (cascadă șterge și accesarile)
```

Formularul din view:
```ejs
<form method="post" action="/sterge_utiliz" enctype="multipart/form-data">
    <input type="hidden" name="id_utiliz" value="<%= u.id %>">
    <button type="submit" class="btn btn-danger btn-sm">Șterge utilizator</button>
</form>
```

---

## GET + POST /administrare — pagina admin animale

**Fișier:** `index.js:932-958` — tag `[etapa8] administrare animale`

Acces condiționat: `areDreptul(Drepturi.adaugareAnimal)`.
Permite adăugare animal nou (cu nume, specie, descriere) și ștergere după ID.

---

## POST /sterge_cont — ștergere cont propriu

**Fișier:** `index.js:961-980` — tag `[etapa8] stergere cont`

```js
if (Utilizator.criptareParola(parola, utilizatorul.salt || "adopthub") !== utilizatorul.parola) {
    req.session.mesajLogin = "Parola incorectă! Contul nu a fost șters.";
    res.redirect("/profil");
    return;
}
// trimite email "La revedere"
// șterge folderul de poze
// șterge din BD
// req.session.destroy()
// redirect /
```

---

## Utilizatori online

**Fișier:** `index.js:118-130` (middleware) + `views/fragmente/footer.ejs`

La fiecare request: INSERT în `accesari` pentru userul logat.
Query pentru online (ultimele 10 min, GROUP BY user):
```sql
SELECT u.username, u.nume, u.prenume, MAX(a.data_accesare) as ult
FROM utilizatori u JOIN accesari a ON a.user_id=u.id
WHERE a.data_accesare > NOW()-INTERVAL '10 minutes'
GROUP BY u.id, u.username, u.nume, u.prenume
```

Clasificare:
- `diff < 5 min` → **verde** (online-activ)
- `diff 5–10 min` → **portocaliu** (online-inactiv)

Format afișare: `username(Nume Prenume)` cu `;` între ei.

Ștergere automată accesări vechi (`index.js:152-154`):
```js
setInterval(function() {
    client.query("DELETE FROM accesari WHERE data_accesare < NOW() - INTERVAL '1 day'");
}, 60 * 60 * 1000); // la fiecare ora
```

---

## Pagini statice: Termeni + Confidențialitate

**Fișiere:** `views/pagini/termeni.ejs` + `views/pagini/confidentialitate.ejs`

Accesibile via ruta generică (`/*splat`). Linkuri în footer.

---

## Sistem drepturi + roluri

**Fișiere:** `module_proprii/drepturi.js` + `module_proprii/roluri.js`

`drepturi.js` — Simboluri pentru fiecare drept:
```js
const Drepturi = {
    vizualizareUtilizatori, stergereUtilizatori, modificareUtilizatori,
    vizualizareAnimale, adaugareAnimal, modificareAnimal, stergereAnimal, adoptareAnimal
}
```

`roluri.js` — clase cu pattern Factory:
- `RolAdmin.areDreptul()` → returnează întotdeauna `true`
- `RolModerator` → are `vizualizareUtilizatori`, `stergereUtilizatori`, `modificareUtilizatori`
- `RolClient` → are `vizualizareAnimale`, `adoptareAnimal`

Reconstituire rol din sesiune: `RolFactory.creeazaRol(rol.cod)` (Utilizator constructor).

---

## Email — nodemailer

**Fișier:** `module_proprii/utilizator.js` (metoda `trimiteMail`)

```js
static emailServer = "ionutionut045@gmail.com";
static emailParola = "PAROLA_APP_GMAIL";  // ← înlocuiți cu App Password din Gmail
```

Emailuri trimise:
| Event | Subiect |
|-------|---------|
| Înregistrare | "Cont nou" |
| Modificare profil | "Date actualizate AdoptHub" |
| Ștergere de admin | "Cont șters AdoptHub" |
| Ștergere proprie | "La revedere de la AdoptHub" |

---

# BONUSURI

---

## [Bonus 0.15p] Salt unic per utilizator

**Fișier:** `module_proprii/utilizator.js` — tag `[etapa8-bonus] salt unic per utilizator`

```js
static criptareParola(parola, salt) {
    return crypto.scryptSync(parola, salt, Utilizator.lungimeCod).toString("hex");
}
```

La înregistrare (`salvareUtilizator`):
```js
let salt = parole.genereazaToken(16);   // salt aleatoriu de 16 chars
let parolaCriptata = Utilizator.criptareParola(this.parola, salt);
campuri.salt = salt;  // salvat în coloana salt din BD
```

La login (`index.js:796`): `Utilizator.criptareParola(parola, u.salt || "adopthub")`
La profil (verificare + schimbare parolă): `index.js:861` + `index.js:874-876`

---

## [Bonus 0.1p] Timp ultima logare

**SQL:** `ALTER TABLE utilizatori ADD COLUMN ultima_logare TIMESTAMP;`

**La login reușit** (`index.js:800`):
```js
client.query("UPDATE utilizatori SET ultima_logare=NOW() WHERE id=$1", [u.id]);
```

Sesiunea stochează `ultima_logare` din ÎNAINTE de această actualizare — deci afișăm penultima logare (loginul anterior).

**Afișare pe homepage** (`views/pagini/index.ejs`):
```ejs
<% if (locals.utilizator.ultima_logare) { %>
    <p>Ultima logare: <%= locals.formateazaData(locals.utilizator.ultima_logare) %></p>
<% } %>
```

---

## [Bonus 0.3p] Sugestii username

**Fișier:** `index.js:759-768` (în POST /inregistrare, ramura username existent)

```js
let candidati = [1,2,3,4,5].map(() => f.username[0] + Math.floor(Math.random()*900+100));
client.query(
    `SELECT username FROM utilizatori WHERE username = ANY(ARRAY[${candidati.map(c=>`'${c}'`).join(",")}])`,
    function(errQ, rez) {
        let existente = rez.rows.map(r => r.username);
        let sugestii = candidati.filter(c => !existente.includes(c)).slice(0, 3);
        res.render("pagini/inregistrare", { err: "...", sugestii });
    }
);
```

Logică: generează 5 candidați (username + 3 cifre random), verifică în BD care nu există, afișează max 3.

**View** (`views/pagini/inregistrare.ejs`): linkuri care completează câmpul username la click:
```ejs
<a href="#" onclick="document.querySelector('[name=username]').value='<%= s %>'"><%= s %></a>
```

---

## [Bonus 0.2p] Site în mentenanță

**Fișiere:** `resurse/json/config.json` + `views/pagini/mentenanta.ejs`

**`index.js:64-66`** — încarcă JSON la pornire + reload automat la modificare:
```js
let config = JSON.parse(fs.readFileSync("resurse/json/config.json"));
fs.watch("resurse/json/config.json", function() {
    config = JSON.parse(fs.readFileSync("resurse/json/config.json"));
});
```

**Middleware** (`index.js:102-104`) — rulează la ORICE request, înainte de rute:
```js
app.use(function(req, res, next) {
    if (config.mentenanta) { res.render("pagini/mentenanta"); return; }
    next();
});
```

**Activare:** schimbi `"mentenanta": true` în `resurse/json/config.json` → **fără restart server**.

---

## [Bonus 0.35p] Data ultimei modificări

**Fișier:** `index.js:357-383`

Calculează `obGlobal.dataModificare = max(dataMaxEjs, dataMaxAnimal)`:

```js
function maxMtimeEjs(folder) {
    // parcurge recursiv views/, returnează cel mai recent mtime al unui .ejs
}
function calculeazaDataModificare() {
    let ejsDate = maxMtimeEjs(path.join(__dirname, "views"));
    client.query("SELECT MAX(data_inregistrare) as m FROM animal", function(err, rez) {
        obGlobal.dataModificare = new Date(Math.max(ejsDate, new Date(rez.rows[0].m).getTime()));
    });
}
```

Se recalculează la orice modificare a unui `.ejs` din `views/`:
```js
fs.watch(path.join(__dirname, "views"), { recursive: true }, function(ev, f) {
    if (f && f.endsWith(".ejs")) calculeazaDataModificare();
});
```

**Detectare** în middleware (`index.js:132-144`): dacă `ultima_logare` (sau `req.session.ultimaAccesare`) < `dataModificare` → `res.locals.afiseazaAvertisment = true`.

**Afișare** în `views/fragmente/footer.ejs`:
```ejs
<% if (locals.afiseazaAvertisment) { %>
<div id="avertisment-modif" style="position:fixed;top:20px;...">
    Au survenit modificări pe site.
</div>
<script>setTimeout(function(){ document.getElementById('avertisment-modif').style.display='none'; }, 3000);</script>
<% } %>
```

Mesajul dispare automat după **3 secunde**.
