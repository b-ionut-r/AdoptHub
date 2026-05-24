const talieOrd = { mica: 1, medie: 2, mare: 3, foarte_mare: 4 };

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

    function valideazaNume() {
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
        return !!ok;
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
        inpEnergie.value     = f.energie   || 1;
        energieVal.innerHTML = f.energie   || "1";
        inpLocatie.value     = f.locatie   || "";
        selTalie.value       = f.talie     || "oricare";
        cbRecent.checked     = !!f.recent;
        taTrasaturi.value    = f.trasaturi || "";
        if (f.specii && f.specii.length)
            for (let o of selSpecie.options) o.selected = f.specii.includes(o.value);
        for (let r of document.getElementsByName("gr-vaccinat"))
            r.checked = (r.value === (f.vaccinat || "toate"));
        cbSalveaza.checked = true;
        document.getElementById("btn-filtrare").click();
    }

    document.getElementById("btn-filtrare").onclick = function() {
        if (!valideazaTot()) return;

        let valNume    = inpNume.value.trim().toLowerCase();
        let valLocatie = inpLocatie.value.trim().toLowerCase();
        let energieMin = parseInt(inpEnergie.value);
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

            if (valNume    && !prod.dataset.nume.toLowerCase().includes(valNume))       cond = false;
            if (valLocatie && !prod.dataset.locatie.toLowerCase().includes(valLocatie)) cond = false;

            if (parseInt(prod.dataset.energie) < energieMin) cond = false;

            if (vaccinat !== "toate") {
                let vac = prod.dataset.vaccinat === "true" ? "da" : "nu";
                if (vac !== vaccinat) cond = false;
            }

            if (cbRecent.checked && new Date(prod.dataset.data) < acumMinus1An) cond = false;

            if (cuvinte.length > 0 && !cuvinte.some(c => prod.dataset.trasaturi.toLowerCase().includes(c)))
                cond = false;

            if (selTalie.value !== "oricare" && prod.dataset.talie !== selTalie.value) cond = false;

            if (speciiSelectate.length > 0 && !speciiSelectate.includes(prod.dataset.specie)) cond = false;

            prod.style.display = cond ? "" : "none";
        }
        if (cbSalveaza.checked) salveazaFiltre();
    };

    function sorteaza(semn) {
        if (!valideazaTot()) return;
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
    }

    document.getElementById("btn-sort-asc").onclick  = function() { sorteaza(1); };
    document.getElementById("btn-sort-desc").onclick = function() { sorteaza(-1); };

    document.getElementById("btn-calcul").onclick = function() {
        if (!valideazaTot()) return;
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

    let ordineInitiala = cards.map(p => p.id);
    incarcaFiltre();

    document.getElementById("btn-reset").onclick = function() {
        if (!confirm("Resetezi toate filtrele?")) return;

        inpNume.value = "";     inpNume.classList.remove("is-invalid");
        inpLocatie.value = "";
        taTrasaturi.value = ""; taTrasaturi.classList.remove("is-invalid");
        selTalie.value = "oricare";
        cbRecent.checked = false;
        inpEnergie.value = 1;   energieVal.innerHTML = "1";

        for (let r of document.getElementsByName("gr-vaccinat")) r.checked = (r.value === "toate");
        for (let o of selSpecie.options) o.selected = true;
        cbSalveaza.checked = false;
        localStorage.removeItem("adopthub_filtru");

        let container = document.getElementById("grid-animale");
        let map = {};
        for (let prod of Array.from(document.getElementsByClassName("animal"))) {
            prod.style.display = "";
            map[prod.id] = prod;
        }
        for (let id of ordineInitiala) container.appendChild(map[id]);
    };
};
