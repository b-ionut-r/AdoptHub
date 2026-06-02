// [etapa8] validare client formular inregistrare - campuri required, regex, email, parola, parole egale
document.getElementById("form-inreg").addEventListener("submit", function(ev) {
    var form = document.getElementById("form-inreg");
    var erori = [];
    var reNume = /^[A-Za-zÀ-ÿĀ-ſ\s-]+$/;
    var reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var username = form.querySelector("[name=username]").value.trim();
    var nume = form.querySelector("[name=nume]").value.trim();
    var prenume = form.querySelector("[name=prenume]").value.trim();
    var parola = document.getElementById("inp-parola").value;
    var rparola = document.getElementById("inp-rparola").value;
    var email = form.querySelector("[name=email]").value.trim();

    if (!username) erori.push("Username obligatoriu.");
    if (!nume) erori.push("Numele este obligatoriu.");
    if (!prenume) erori.push("Prenumele este obligatoriu.");
    if (!parola) erori.push("Parola este obligatorie.");
    if (!email) erori.push("Email-ul este obligatoriu.");
    if (parola !== rparola) erori.push("Parolele nu coincid.");
    if (nume && !reNume.test(nume)) erori.push("Numele poate conține doar litere, spații și liniuță.");
    if (prenume && !reNume.test(prenume)) erori.push("Prenumele poate conține doar litere, spații și liniuță.");
    if (email && !reEmail.test(email)) erori.push("Format email invalid.");
    if (parola && parola.length < 6) erori.push("Parola trebuie să aibă cel puțin 6 caractere.");

    if (erori.length > 0) {
        ev.preventDefault();
        document.getElementById("mesaj-eroare-client").textContent = erori.join(" ");
    }
});
