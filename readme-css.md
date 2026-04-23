# Ghid CSS — AdoptHub

Referință rapidă pentru prezentare. Fiecare concept folosit efectiv în `general.css` și `reset.css`.

---

## 1. Variabile CSS (Custom Properties)

Variabilele se definesc pe un element (la noi pe `body`) și se pot folosi oriunde în CSS.

```css
body {
    --culoare-accent: #c96b43;   /* definire */
}

header {
    background-color: var(--culoare-accent);   /* folosire */
}
```

**De ce pe `body`?** Ca să fie accesibile din orice selector din pagină.
**Avantaj:** schimbi culoarea într-un singur loc și se actualizează peste tot.

---

## 2. CSS Grid

Grid împarte un container în rânduri și coloane, iar elementele copil se plasează în zonele definite.

```css
main {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;   /* 3 coloane egale */
    grid-template-areas:
        "zona1 zona1 zona1"   /* zona1 ocupă toată linia */
        "zona5 zona6 zona7"   /* câte o coloană fiecare */
        "zona3 zona3 zona2";  /* zona3 pe 2 col, zona2 pe 1 */
    gap: 1rem;                /* spațiu între celule */
}

.zona1 { grid-area: zona1; }  /* asociezi elementul cu zona din template */
```

**`1fr`** = o fracție din spațiul disponibil. `1fr 1fr 1fr` = trei coloane egale.
**`grid-template-areas`** = hartă vizuală a layout-ului. Numele din ghilimele trebuie să apară în `grid-area`.
**`gap`** = distanța dintre celule (înlocuiește margin-urile manuale).

```css
#ghid-pdf {
    grid-column: 1 / -1;   /* se întinde de la prima la ultima coloană */
}
```

**`1 / -1`** = de la linia 1 până la ultima linie (indiferent câte coloane sunt).

---

## 3. CSS Flexbox

Flex aranjează elementele copil pe o singură axă (orizontală sau verticală).

```css
.video-container {
    display: flex;              /* activează flexbox */
    align-items: flex-start;    /* aliniază pe axa perpendiculară (vertical) — sus */
}

.video-container iframe {
    flex: 1;     /* ocupă tot spațiul rămas după tabs */
}

.video-tabs {
    display: flex;
    flex-direction: column;   /* axă verticală — elementele merg în jos */
    gap: 0.5rem;
}
```

**`flex: 1`** = "ia tot spațiul disponibil". Dacă iframe are `flex: 1` și tabs-urile au lățime fixă, iframe-ul umple restul.
**`align-items`** = aliniere pe axa secundară. `flex-start` = sus (pentru direcție orizontală).
**`justify-content`** = aliniere pe axa principală (stânga-dreapta dacă e row, sus-jos dacă e column).

---

## 4. Media Queries

Aplică stiluri diferite în funcție de lățimea ecranului.

```css
@media (max-width: 1000px) {
    main {
        grid-template-columns: 1fr 1fr;   /* 2 coloane în loc de 3 */
    }
}

@media (max-width: 700px) {
    main {
        grid-template-columns: 1fr;   /* 1 coloană */
    }
    * {
        animation: none;
        transition: none;   /* dezactivate pe mobile pentru performanță */
    }
}
```

**Logica:** stilurile de bază sunt pentru desktop. Media queries suprascriu doar ce trebuie schimbat la ecrane mai mici.

---

## 5. Tranziții (`transition`)

Animează trecerea de la o stare la alta (ex: la hover).

```css
.video-tabs a {
    transition: background-color 0.2s ease, color 0.2s ease;
}

.video-tabs a:hover {
    background-color: var(--culoare-accent);
}
```

**Sintaxă:** `transition: proprietate durată timing-function`
**`ease`** = pornește lent, accelerează, frânează la final (cel mai natural).
Tranziția se pune pe **starea normală**, nu pe `:hover`.

---

## 6. Transform

Mișcă, rotește sau scalează un element vizual (fără a afecta layout-ul celorlalte).

```css
#link-top:hover {
    transform: rotate(90deg);       /* rotație 90° în sensul ceasului */
}

.video-tabs a:hover {
    transform: translateX(6px);    /* mută 6px spre dreapta */
}
```

**`rotate(90deg)`** = rotație față de centrul elementului.
**`translateX(n)`** = deplasare orizontală. Pozitiv = dreapta, negativ = stânga.
**Important:** `transform` nu mișcă elementul din flux — celelalte elemente nu se deplasează.

---

## 7. Selectori speciali

### `:nth-child()`
```css
td:nth-child(even) {
    border-left-color: var(--culoare-highlight);   /* coloanele pare */
}
td:nth-child(odd):not(:first-child) {
    border-left-color: var(--culoare-accent);       /* coloanele impare, mai puțin prima */
}
```
**`even`** = 2, 4, 6... / **`odd`** = 1, 3, 5...
**`:not(:first-child)`** = exclude primul copil.

### `+` (adjacent sibling)
```css
#animale-recomandate article + article {
    margin-top: 2rem;
}
```
Aplică stilul pe un `article` care vine **imediat după** alt `article`. Primul articol nu e afectat.

### `>` (direct child)
```css
header, footer, main > * {
    border: 1px solid var(--culoare-border);
}
```
**`main > *`** = orice element care e **copil direct** al lui `main` (nu și nepoți).

---

## 8. `position: fixed` și `::after`

### `position: fixed`
```css
#link-top {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
}
```
Elementul rămâne **fix pe ecran** indiferent de scroll. `bottom` și `right` îl poziționează față de fereastra browserului.

### `::after` (pseudo-element)
```css
#link-top::after {
    content: attr(data-tooltip);   /* ia textul din atributul HTML data-tooltip */
    position: absolute;
    opacity: 0;                    /* invizibil implicit */
}

#link-top:hover::after {
    opacity: 1;                    /* apare la hover */
}
```
`::after` creează un element virtual **după** conținutul elementului. Nu există în HTML — e generat de CSS.
**`attr(data-tooltip)`** = citește valoarea atributului `data-tooltip` din HTML (`data-tooltip="Înapoi sus"`).

---

## 9. `box-shadow` și `filter: blur`

### `box-shadow`
```css
/* umbră externă */
header {
    box-shadow: 0px 0px 5px var(--culoare-border);
    /* offset-x  offset-y  blur  culoare */
}

/* umbră internă (inset) */
#link-top {
    box-shadow: inset 0 4px 8px rgba(255,255,255,0.2);
}

/* chenar simulat cu shadow (hover tabel) */
tbody tr:hover {
    box-shadow: 0 0 0 4px var(--culoare-accent);
    /* blur=0, spread=4px → chenar de 4px fără blur */
}
```
**`inset`** = umbra e în interiorul elementului (efect 3D).
**Al patrulea număr** (spread) mărește/micșorează umbra uniform.

### `filter: blur`
```css
#triunghi {
    filter: blur(3px);   /* estompat implicit */
}
#link-top:hover #triunghi {
    filter: blur(0);     /* clar la hover */
}
```
`filter: blur(n)` aplică un efect de estompare. `blur(0)` = fără efect.

---

## 10. `box-sizing: border-box`

```css
*, *::before, *::after {
    box-sizing: border-box;
}
```

**Problema implicită:** în mod normal, `width: 200px` înseamnă că border și padding se adaugă **pe deasupra** → elementul depășește 200px.
**Cu `border-box`:** `width: 200px` include border și padding → elementul rămâne exact 200px.
Aproape orice proiect modern folosește asta.

---

## 11. `opacity`

```css
#link-top {
    opacity: 0.65;   /* 65% opac = ușor transparent */
}
#link-top:hover {
    opacity: 1;      /* complet opac la hover */
}
```
Valori: `0` = invizibil, `1` = complet opac. Afectează elementul **și tot conținutul** lui.

---

## 12. `border-radius: 50%`

```css
#link-top {
    width: 70px;
    height: 70px;
    border-radius: 50%;   /* face un cerc perfect */
}
```

`border-radius` rotunjește colțurile unui element. La `50%` pe un element **pătrat** (lățime = înălțime), toate colțurile se rotunjesc până formează un cerc.

---

## 13. `overflow-x: auto`

```css
.tabel-container {
    overflow-x: auto;
}
```

Dacă conținutul (tabelul) e mai lat decât containerul, în loc să rupă layout-ul, apare o **bară de scroll orizontal** doar pe zona respectivă. Restul paginii rămâne neafectat.

---

## 14. `pointer-events: none`

```css
#link-top::after {
    pointer-events: none;
}
```

Face elementul **invizibil pentru mouse** — cursorul trece prin el ca și cum nu există. Fără asta, când cursorul intră pe tooltip (pseudo-elementul `::after`), hover-ul pe `#link-top` s-ar opri, iar tooltip-ul ar dispărea și reapărea în buclă.

---

## 15. `list-style-position: inside`

```css
header nav ul {
    list-style: disc inside;
}
```

Implicit, bullet-ul (`list-style-position: outside`) e plasat **în afara** box-ului elementului `li`, la stânga textului. Când textul e centrat (`text-align: center`), textul se centrează dar bullet-ul rămâne lipit de marginea stângă.

Cu `inside`, bullet-ul intră **în fluxul textului** și se centrează împreună cu el.

---

## Rezumat rapid

| Concept | Ce face |
|---|---|
| `var(--x)` | Folosește o variabilă CSS definită cu `--x` |
| `display: grid` | Layout în rânduri + coloane cu zone numite |
| `display: flex` | Aranjare liniară (orizontal sau vertical) |
| `@media (max-width)` | Stiluri diferite pe ecrane mai mici |
| `transition` | Animație la schimbarea de stare (hover etc.) |
| `transform: rotate/translateX` | Rotire / deplasare vizuală |
| `position: fixed` | Element fix pe ecran la scroll |
| `::after` | Element virtual generat de CSS |
| `box-shadow: inset` | Umbră în interiorul elementului |
| `filter: blur` | Efect de estompare |
| `box-sizing: border-box` | Padding + border incluse în width/height |
| `nth-child(even/odd)` | Selectează copii pari / impari |
| `A + B` | B care vine imediat după A |
| `A > *` | Toți copiii direcți ai lui A |
| `border-radius: 50%` | Transformă un pătrat în cerc |
| `overflow-x: auto` | Scroll orizontal când conținutul depășește lățimea |
| `pointer-events: none` | Elementul nu reacționează la mouse |
