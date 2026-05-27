var tema = localStorage.getItem("tema") || "light";
document.documentElement.dataset.tema = tema;

document.addEventListener("DOMContentLoaded", function() {
    var sel = document.getElementById("sel-tema");
    if (!sel) return;
    sel.value = tema;
    sel.onchange = function() {
        document.documentElement.dataset.tema = this.value;
        localStorage.setItem("tema", this.value);
    };
});
