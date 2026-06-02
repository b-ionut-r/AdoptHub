const talieOrd = { mica: 1, medie: 2, mare: 3, foarte_mare: 4 };
const K = 6;
let paginaCurenta = 1;

// Bonus 7: normalizare diacritice pentru căutare text
function norm(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

window.onload = function() {
    let inpNume     = document.getElementById("inp-nume");
    let inpEnergie  = document.getElementById("inp-energie");
    let energieVal  = document.getElementById("energie-val");
    let inpLocatie  = document.getElementById("inp-locatie");
    let taTrasaturi = document.getElementById("ta-trasaturi");
    let selTalie    = document.getElementById("sel-talie");
    let selSpecie   = document.getElementById("sel-specie");
    let cbRecent    = document.getElementById("cb-recent");
    let cbSalveaza  = document.getElementById("cb-salveaza");

    inpEnergie.oninput = function() {
        energieVal.innerHTML = this.value;
    };

    function valideazaNume() { /* handler */
        let val = inpNume.value.trim();
        let ok = val === "" || /^[a-zA-ZăâîșțĂÂÎȘȚ\s]+$/.test(val);
        inpNume.classList.toggle("is-invalid", !ok);
        return ok;
    }

    function valideazaTrasaturi() {
        let val = taTrasaturi.value.trim();
        let ok = val === "" || /^[a-zA-ZăâîșțĂÂÎȘȚ\s,]+$/.test(val);
        taTrasaturi.classList.toggle("is-invalid", !ok);
        return ok;
    }

    inpNume.addEventListener("input", valideazaNume);
    taTrasaturi.addEventListener("input", valideazaTrasaturi);

    function valideazaTot() {
        let ok = valideazaNume() & valideazaTrasaturi();
        if (!ok) alert("Corectați câmpurile marcate cu roșu înainte de a continua.");
        return !!ok; // convertim la boolean pentru a returna false dacă ok e 0 (adică fals) și true dacă ok e 1 (adică adevărat)
    }

    function salveazaFiltre() {
        let speciiSel = Array.from(selSpecie.options).filter(o => o.selected).map(o => o.value);
        let vaccinat = "";
        for (let r of document.getElementsByName("gr-vaccinat")) if (r.checked) { vaccinat = r.value; break; }
        localStorage.setItem("adopthub_filtru", JSON.stringify({
            nume:      inpNume.value,
            energie:   inpEnergie.value,
            locatie:   inpLocatie.value,
            talie:     selTalie.value,
            vaccinat,
            recent:    cbRecent.checked,
            trasaturi: taTrasaturi.value,
            specii:    speciiSel
        }));
    }

    function incarcaFiltre() {
        let raw = localStorage.getItem("adopthub_filtru");
        if (!raw) return;
        let f = JSON.parse(raw);
        inpNume.value        = f.nume      || "";
        inpEnergie.value     = f.energie   || inpEnergie.min || 1;
        energieVal.innerHTML = f.energie   || inpEnergie.min || "1";
        inpLocatie.value     = f.locatie   || "";
        selTalie.value       = f.talie     || "oricare";
        cbRecent.checked     = !!f.recent;
        taTrasaturi.value    = f.trasaturi || "";
        if (f.specii && f.specii.length)
            for (let o of selSpecie.options) o.selected = f.specii.includes(o.value);
        for (let r of document.getElementsByName("gr-vaccinat"))
            r.checked = (r.value === (f.vaccinat || "toate"));
        cbSalveaza.checked = true;
        filtreaza();
    }

    // Bonus 5: afișare pagină din grila filtrată
    function afiseazaPagina(p) {
        paginaCurenta = p;
        let cards = Array.from(document.getElementsByClassName("animal"));
        let vizibile = cards.filter(c => c.dataset.passFilter !== "0");
        for (let c of cards) c.style.display = "none";
        let start = (p - 1) * K;
        for (let i = start; i < Math.min(start + K, vizibile.length); i++)
            vizibile[i].style.display = "";
        // Bonus 15 + 3
        document.getElementById("nr-animale").textContent = vizibile.length;
        document.getElementById("msg-gol").style.display = vizibile.length === 0 ? "" : "none";
        let nav = document.getElementById("paginare");
        nav.innerHTML = "";
        let nrPag = Math.ceil(vizibile.length / K);
        for (let i = 1; i <= nrPag; i++) {
            btn.textContent = i;
            btn.className = "btn btn-sm " + (i === p ? "btn-primary" : "btn-outline-primary");
            (function(pg) { btn.onclick = function() { afiseazaPagina(pg); }; })(i);
            nav.appendChild(btn);
        }
    }

    // Bonus 4: funcție de filtrare separată (apelată și la onchange)
    function filtreaza() {
        let valNume    = inpNume.value.trim().toLowerCase();
        let energieMin = parseInt(inpEnergie.value);
        let valLocatie = inpLocatie.value.trim().toLowerCase();
        /* talie din dataset */
        let cuvinte    = taTrasaturi.value.trim() !== ""
            ? taTrasaturi.value.trim().toLowerCase().split(",").map(c => c.trim()).filter(c => c)
            : [];

        let vaccinat = "";
        for (let r of document.getElementsByName("gr-vaccinat"))
            if (r.checked) { vaccinat = r.value; break; }

        let acumMinus1An = new Date();
        acumMinus1An.setFullYear(acumMinus1An.getFullYear() - 1);

        let speciiSelectate = Array.from(selSpecie.options).filter(o => o.selected).map(o => o.value);

        for (let prod of document.getElementsByClassName("animal")) {
            let cond = true;

            // Bonus 7: comparație insensibilă la diacritice
            if (valNume    && !norm(prod.dataset.nume).includes(norm(valNume)))             cond = false;
            if (valLocatie && !norm(prod.dataset.locatie || "").includes(norm(valLocatie))) cond = false;

            if (parseInt(prod.dataset.energie) < energieMin) cond = false;

            if (vaccinat !== "toate") {
                let vac = prod.dataset.vaccinat === "true" ? "da" : "nu";
                if (vac !== vaccinat) cond = false;
            }

            if (cbRecent.checked && new Date(prod.dataset.data) < acumMinus1An) cond = false;

            // Bonus 7: comparație insensibilă la diacritice pentru trăsături
            if (cuvinte.length > 0 && !cuvinte.some(c => norm(prod.dataset.trasaturi || "").includes(norm(c))))
                cond = false;

            if (selTalie.value !== "oricare" && prod.dataset.talie !== selTalie.value) cond = false; /* talie din dataset */

            if (speciiSelectate.length > 0 && !speciiSelectate.includes(prod.dataset.specie)) cond = false;

            prod.dataset.passFilter = cond ? "1" : "0";
        }
        if (cbSalveaza.checked) salveazaFiltre();
        afiseazaPagina(1);
    }

    document.getElementById("btn-filtrare").onclick = function() {
        if (!valideazaTot()) return;
        filtreaza();
    };

    // Bonus 4: onchange pe toate cele 8 inputuri de filtrare
    inpNume.addEventListener("input", filtreaza);
    inpEnergie.addEventListener("input", filtreaza);
    inpLocatie.addEventListener("input", filtreaza);
    selTalie.addEventListener("change", filtreaza);
    selSpecie.addEventListener("change", filtreaza);
    cbRecent.addEventListener("change", filtreaza);
    taTrasaturi.addEventListener("input", filtreaza);
    for (let r of document.getElementsByName("gr-vaccinat")) r.addEventListener("change", filtreaza);

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

    document.getElementById("btn-sort-asc").onclick  = function() { sorteaza(1); };
    document.getElementById("btn-sort-desc").onclick = function() { sorteaza(-1); };

    document.getElementById("btn-calcul").onclick = function() {
        let suma = 0, nr = 0;
        for (let prod of document.getElementsByClassName("animal")) {
            if (prod.style.display !== "none") {
                suma += parseInt(prod.dataset.varsta);
                nr++;
            }
        }
        if (nr === 0) { alert("Nu există animale vizibile."); return; }
        let div = document.createElement("div");
        div.id = "div-calcul";
        div.innerHTML = `Media vârstei: <strong>${(suma / nr).toFixed(1)} luni</strong> (${nr} animale)`;
        document.body.appendChild(div);
        setTimeout(function() { div.remove(); }, 2000);
    };

    let cards = Array.from(document.getElementsByClassName("animal"));
    for (let i = 0; i < cards.length; i++) {
        setTimeout(function(card) { card.classList.add("vizibil"); }, (i + 1) * 100, cards[i]);
    }

    for (let prod of document.getElementsByClassName("animal"))
        prod.dataset.passFilter = "1";

    let ordineInitiala = cards.map(p => p.id);
    incarcaFiltre();
    if (!localStorage.getItem("adopthub_filtru")) afiseazaPagina(1);

    document.getElementById("btn-reset").onclick = function() {
        if (!confirm("Resetezi toate filtrele?")) return;

        inpNume.value = "";     inpNume.classList.remove("is-invalid");
        inpLocatie.value = "";
        taTrasaturi.value = ""; taTrasaturi.classList.remove("is-invalid");
        selTalie.value = "oricare";
        cbRecent.checked = false;
        inpEnergie.value = inpEnergie.min || 1;
        energieVal.innerHTML = inpEnergie.min || "1";

        for (let r of document.getElementsByName("gr-vaccinat")) r.checked = (r.value === "toate");
        for (let o of selSpecie.options) o.selected = true;
        cbSalveaza.checked = false;
        localStorage.removeItem("adopthub_filtru");

        let container = document.getElementById("grid-animale");
        let map = {};
        for (let prod of Array.from(document.getElementsByClassName("animal"))) {
            prod.dataset.passFilter = "1";
            map[prod.id] = prod;
        }
        for (let id of ordineInitiala) container.appendChild(map[id]);
        afiseazaPagina(1);
    };

    // Bonus 11: modal Bootstrap la click pe card
    for (let card of document.getElementsByClassName("animal")) {
        card.style.cursor = "pointer";
        card.addEventListener("click", function(e) {
            if (e.target.closest("a,button")) return;
            let id = this.id.replace("elem_", "");
            document.getElementById("modal-titlu").textContent = this.dataset.nume;
            document.getElementById("modal-link").href = "/animal/" + id;
            document.getElementById("modal-body").innerHTML =
                `<table class="table table-sm">
                  <tr><td>Vârstă</td><td>${this.dataset.varsta} luni</td></tr>
                  <tr><td>Energie</td><td>${this.dataset.energie}/10</td></tr>
                  <tr><td>Talie</td><td>${this.dataset.talie.replace("_", " ")}</td></tr>
                  <tr><td>Vaccinat</td><td>${this.dataset.vaccinat === "true" ? "Da" : "Nu"}</td></tr>
                  <tr><td>Trăsături</td><td>${this.dataset.trasaturi || "—"}</td></tr>
                </table>`;
            new bootstrap.Modal(document.getElementById("modal-animal")).show();
        });
    }
};
