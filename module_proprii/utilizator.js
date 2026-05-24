const AccesBD = require("./accesBD.js");
const parole = require("./parole.js");
const { RolFactory } = require("./roluri.js");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

/**
 * Clasă care reprezintă un utilizator al platformei AdoptHub.
 */
class Utilizator {
    static tabel = "utilizatori";
    static parolaCriptare = "adopthub";
    static emailServer = "ionutionut045@gmail.com";
    static emailParola = "PAROLA_APP_GMAIL"; // se completează cu app password din Gmail
    static lungimeCod = 64;
    static numeDomeniu = "localhost:8080";

    /**
     * @param {Object} [obj={}]
     * @param {number} [obj.id]
     * @param {string} [obj.username]
     * @param {string} [obj.parola]
     * @param {string} [obj.email]
     * @param {string} [obj.rol]
     * @param {string} [obj.nume]
     * @param {string} [obj.prenume]
     * @param {string} [obj.poza]
     * @param {string} [obj.cod]
     */
    constructor({ id, username, parola, email, rol, nume, prenume, poza, cod } = {}) {
        this.id = id;
        this.username = username;
        this.parola = parola;
        this.email = email;
        this.nume = nume;
        this.prenume = prenume;
        this.poza = poza;
        this.cod = cod;
        this.rol = rol ? (rol.cod ? RolFactory.creeazaRol(rol.cod) : RolFactory.creeazaRol(rol)) : null;
    }

    /**
     * Verifică dacă numele respectă formatul (literă mare + litere mici, inclusiv diacritice).
     * @param {string} nume
     * @returns {boolean}
     */
    verificaNume(nume) {
        return !!nume && /^[A-ZĂÂÎȘȚ][a-zăâîșț]+$/.test(nume);
    }

    /**
     * Verifică dacă username-ul conține doar caractere alfanumerice și #_./
     * @param {string} username
     * @returns {boolean}
     */
    verificaUsername(username) {
        return !!username && /^[A-Za-z0-9#_./]+$/.test(username);
    }

    /**
     * Criptează o parolă cu scrypt.
     * @param {string} parola
     * @returns {string} Parola criptată în hex
     */
    static criptareParola(parola) {
        return crypto.scryptSync(parola, Utilizator.parolaCriptare, Utilizator.lungimeCod).toString("hex");
    }

    /**
     * Înregistrează utilizatorul în baza de date.
     * Aruncă o eroare dacă username-ul există deja.
     * @param {Function} [callback]
     */
    salvareUtilizator(callback) {
        let parolaCriptata = Utilizator.criptareParola(this.parola);
        let token = parole.genereazaToken(100);
        let utiliz = this;
        AccesBD.getInstanta().insert({
            tabel: Utilizator.tabel,
            campuri: {
                username: this.username,
                parola: parolaCriptata,
                email: this.email,
                rol: this.rol ? this.rol.cod : "comun",
                nume: this.nume || "",
                prenume: this.prenume || "",
                poza: this.poza || "",
                cod: token
            }
        }, function(err, rez) {
            if (err) {
                if (err.code === "23505") // unique violation
                    throw new Error("Username-ul este deja folosit de un alt utilizator.");
                console.error("Eroare salvare utilizator:", err.message);
                if (callback) callback(err, null);
            } else {
                utiliz.trimiteMail(
                    "Înregistrare AdoptHub",
                    "Ai fost înregistrat cu succes. Username-ul tău este " + utiliz.username,
                    `<h1>Bun venit pe AdoptHub!</h1><p>Username-ul tău este <strong>${utiliz.username}</strong>.</p>`
                );
                if (callback) callback(null, rez);
            }
        });
    }

    /**
     * Modifică datele utilizatorului în baza de date.
     * Aruncă o eroare dacă utilizatorul nu există.
     * @param {Object} obNouDate - Obiect cu câmpurile de actualizat
     * @param {Function} callback
     */
    modifica(obNouDate, callback) {
        let utiliz = this;
        AccesBD.getInstanta().select({
            tabel: Utilizator.tabel,
            campuri: ["id"],
            conditiiAnd: [`id=${this.id}`]
        }, function(err, rez) {
            if (err || rez.rowCount === 0)
                throw new Error("Utilizatorul nu există în baza de date.");
            AccesBD.getInstanta().update({
                tabel: Utilizator.tabel,
                campuri: obNouDate,
                conditiiAnd: [`id=${utiliz.id}`]
            }, callback);
        });
    }

    /**
     * Șterge utilizatorul din baza de date.
     * Aruncă o eroare dacă utilizatorul nu există.
     * @param {Function} callback
     */
    sterge(callback) {
        AccesBD.getInstanta().select({
            tabel: Utilizator.tabel,
            campuri: ["id"],
            conditiiAnd: [`id=${this.id}`]
        }, function(err, rez) {
            if (err || rez.rowCount === 0)
                throw new Error("Utilizatorul nu există în baza de date.");
            AccesBD.getInstanta().delete({
                tabel: Utilizator.tabel,
                conditiiAnd: [`id=${rez.rows[0].id}`]
            }, callback);
        });
    }

    /**
     * Caută un utilizator după username și apelează callback-ul cu rezultatul.
     * @param {string} username
     * @param {Object} obParam - Obiect suplimentar transmis callback-ului
     * @param {Function} proceseazaUtiliz - callback(utilizator, obParam, eroare)
     */
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

    /**
     * Caută asincron un utilizator după username.
     * @param {string} username
     * @returns {Promise<Utilizator|null>}
     */
    static async getUtilizDupaUsernameAsync(username) {
        if (!username) return null;
        try {
            let rez = await AccesBD.getInstanta().selectAsync({
                tabel: Utilizator.tabel,
                campuri: ["*"],
                conditiiAnd: [`username='${username}'`]
            });
            return rez && rez.rowCount > 0 ? new Utilizator(rez.rows[0]) : null;
        } catch (e) {
            console.error("getUtilizDupaUsernameAsync eroare:", e.message);
            return null;
        }
    }

    /**
     * Caută utilizatori după orice combinație de proprietăți.
     * Proprietățile undefined sau null sunt ignorate.
     * @param {Object} obParam - Obiect cu proprietăți de filtrat
     * @param {Function} callback - callback(err, listaUtilizatori)
     */
    static cauta(obParam, callback) {
        let conditii = [];
        for (let prop in obParam)
            if (obParam[prop] !== undefined && obParam[prop] !== null)
                conditii.push(`${prop}='${obParam[prop]}'`);
        AccesBD.getInstanta().select({
            tabel: Utilizator.tabel,
            campuri: ["*"],
            conditiiAnd: conditii
        }, function(err, rez) {
            if (err) { callback(err, []); return; }
            callback(null, rez.rows.map(r => new Utilizator(r)));
        });
    }

    /**
     * Versiunea asincronă a metodei cauta().
     * @param {Object} obParam - Obiect cu proprietăți de filtrat
     * @returns {Promise<Utilizator[]>}
     */
    static async cautaAsync(obParam) {
        let conditii = [];
        for (let prop in obParam)
            if (obParam[prop] !== undefined && obParam[prop] !== null)
                conditii.push(`${prop}='${obParam[prop]}'`);
        try {
            let rez = await AccesBD.getInstanta().selectAsync({
                tabel: Utilizator.tabel,
                campuri: ["*"],
                conditiiAnd: conditii
            });
            return rez ? rez.rows.map(r => new Utilizator(r)) : [];
        } catch (e) {
            console.error("cautaAsync eroare:", e.message);
            return [];
        }
    }

    /**
     * Verifică dacă utilizatorul are dreptul dat, în funcție de rolul său.
     * @param {Symbol} drept - Un simbol din Drepturi
     * @returns {boolean}
     */
    areDreptul(drept) {
        if (!this.rol) return false;
        return this.rol.areDreptul(drept);
    }

    /**
     * Trimite un e-mail utilizatorului.
     * @param {string} subiect
     * @param {string} mesajText - Versiunea plain text
     * @param {string} mesajHtml - Versiunea HTML
     * @param {Array} [atasamente=[]] - Listă de atașamente nodemailer
     */
    async trimiteMail(subiect, mesajText, mesajHtml, atasamente = []) {
        let transp = nodemailer.createTransport({
            service: "gmail",
            secure: false,
            auth: {
                user: Utilizator.emailServer,
                pass: Utilizator.emailParola
            },
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
}

module.exports = { Utilizator };
