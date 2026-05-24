document.addEventListener("DOMContentLoaded", function() {
    var btn = document.getElementById("btn-tema");
    if (!btn) return;

    function actualizeazaButon(tema) {
        var icon = document.getElementById("tema-icon");
        if (tema === "dark") {
            btn.checked = true;
            if (icon) icon.className = "fa-solid fa-sun";
        } else {
            btn.checked = false;
            if (icon) icon.className = "fa-solid fa-moon";
        }
    }

    actualizeazaButon(document.documentElement.dataset.tema || "light");

    btn.addEventListener("change", function() {
        var nouaTema = this.checked ? "dark" : "light";
        document.documentElement.dataset.tema = nouaTema;
        localStorage.setItem("tema", nouaTema);
        actualizeazaButon(nouaTema);
    });
});
