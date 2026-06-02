const AccesBD = require("./accesBD.js");
const parole = require("./parole.js");
const { RolFactory } = require("./roluri.js");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

class Utilizator {
    static tabel = "utilizatori";
    static emailServer = "ionutionut045@gmail.com";
    static emailParola = "PAROLA_APP_GMAIL";
    static lungimeCod = 64;
    static numeDomeniu = "localhost:8080";

    constructor({ id, username, parola, email, rol, nume, prenume, poza, cod,
                  cale_imagine, data_nasterii, data_inregistrare, culoare_chat,
                  ocupatie, confirmat_mail, salt, ultima_logare } = {}) {
        this.id = id;
        this.username = username;
        this.parola = parola;
        this.email = email;
        this.nume = nume;
        this.prenume = prenume;
        this.poza = poza;
        this.cale_imagine = cale_imagine;
        this.cod = cod;
        this.salt = salt;
        this.ultima_logare = ultima_logare;
        this.data_nasterii = data_nasterii;
        this.data_inregistrare = data_inregistrare;
        this.culoare_chat = culoare_chat || "black";
        this.ocupatie = ocupatie;
        this.confirmat_mail = confirmat_mail;
        this.rol = rol ? (rol.cod ? RolFactory.creeazaRol(rol.cod) : RolFactory.creeazaRol(rol)) : null;
    }

    // [etapa8-bonus] salt unic per utilizator - parola criptata cu scrypt(parola, salt propriu)
    static criptareParola(parola, salt) {
        return crypto.scryptSync(parola, salt, Utilizator.lungimeCod).toString("hex");
    }

    // [etapa8] token confirmare - 4 litere random + scrypt(username, domeniu, 20) hex 40 chars
    static genereazaToken(username) {
        let litere = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let prefix = "";
        for (let i = 0; i < 4; i++)
            prefix += litere[Math.floor(Math.random() * litere.length)];
        let hash = crypto.scryptSync(username, Utilizator.numeDomeniu, 20).toString("hex").replace(/[^A-Za-z0-9]/g, "0");
        return prefix + hash;
    }

    // [etapa8] salvare utilizator in BD - salt unic, parola criptata, cod confirmare, email "Cont nou"
    salvareUtilizator() {
        let salt = parole.genereazaToken(16);
        let parolaCriptata = Utilizator.criptareParola(this.parola, salt);
        let token = Utilizator.genereazaToken(this.username);
        let utiliz = this;
        let campuri = {
            username: this.username,
            nume: this.nume,
            prenume: this.prenume,
            email: this.email,
            parola: parolaCriptata,
            salt: salt,
            culoare_chat: this.culoare_chat || "black",
            cod: token
        };
        if (this.data_nasterii) campuri.data_nasterii = this.data_nasterii;
        if (this.ocupatie) campuri.ocupatie = this.ocupatie;
        if (this.cale_imagine) campuri.cale_imagine = this.cale_imagine;
        AccesBD.getInstanta().insert({
            tabel: Utilizator.tabel,
            campuri: campuri
        }, function(err) {
            if (err) { console.log(err); return; }
            utiliz.trimiteMail(
                "Cont nou",
                `Bine ai venit în comunitatea AdoptHub. Username-ul tău este: ${utiliz.username}`,
                `<p>Bine ai venit în comunitatea <strong>AdoptHub</strong>.</p>
<p>Username-ul tău este: <strong style="color:green">${utiliz.username}</strong></p>
<p><a href="http://${Utilizator.numeDomeniu}/confirmare/${utiliz.username}/${token}">Click aici pentru confirmare cont</a></p>`
            );
        });
    }

    async trimiteMail(subiect, mesajText, mesajHtml, atasamente = []) {
        let transp = nodemailer.createTransport({
            service: "gmail",
            secure: false,
            auth: { user: Utilizator.emailServer, pass: Utilizator.emailParola },
            tls: { rejectUnauthorized: false }
        });
        await transp.sendMail({
            from: Utilizator.emailServer,
            to: this.email,
            subject: subiect,
            text: mesajText,
            html: mesajHtml,
            attachments: atasamente
        });
        console.log("Mail trimis către", this.email);
    }

    static getUtilizDupaUsername(username, obParam, proceseazaUtiliz) {
        if (!username) return;
        AccesBD.getInstanta().select({
            tabel: Utilizator.tabel,
            campuri: ["*"],
            conditiiAnd: [`username='${username}'`]
        }, function(err, rez) {
            if (err) { proceseazaUtiliz(null, obParam, -2); return; }
            if (rez.rowCount === 0) { proceseazaUtiliz(null, obParam, -1); return; }
            proceseazaUtiliz(new Utilizator(rez.rows[0]), obParam, null);
        });
    }

    static getToti(callback) {
        AccesBD.getInstanta().select({
            tabel: Utilizator.tabel,
            campuri: ["*"],
            conditiiAnd: []
        }, callback);
    }

    areDreptul(drept) {
        if (!this.rol) return false;
        return this.rol.areDreptul(drept);
    }
}

module.exports = { Utilizator };
