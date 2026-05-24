// ATENTIE! Nu este implementată protecția contra SQL injection.

const { Client } = require("pg");

/**
 * Construiește clauza WHERE dintr-un array de condiții.
 * @param {string[]|string[][]} conditiiAnd - Array flat (AND) sau vector de vectori (AND intern, OR extern)
 * @returns {string} Clauza WHERE sau string gol
 */
function buildWhere(conditiiAnd) {
    if (!conditiiAnd || conditiiAnd.length === 0) return "";
    if (Array.isArray(conditiiAnd[0])) {
        let grupuri = conditiiAnd.filter(g => g.length > 0).map(g => g.join(" and "));
        return grupuri.length > 0 ? `where ${grupuri.join(" or ")}` : "";
    }
    return `where ${conditiiAnd.join(" and ")}`;
}

/**
 * Clasă Singleton pentru accesarea bazei de date PostgreSQL.
 */
class AccesBD {
    static #instanta = null;
    static #initializat = false;

    /**
     * Constructorul este privat în mod logic — se apelează doar din getInstanta().
     * @throws {Error} Dacă se încearcă a doua instanțiere.
     */
    constructor() {
        if (AccesBD.#instanta)
            throw new Error("AccesBD a fost deja instanțiat.");
        if (!AccesBD.#initializat)
            throw new Error("Apelați getInstanta(), nu constructorul direct.");
    }

    /**
     * Inițializează conexiunea locală la baza de date adopthub_web.
     */
    initLocal() {
        this.client = new Client({
            database: "adopthub_web",
            user: "adopthub_web",
            password: "adopthub2025",
            host: "localhost",
            port: 5432
        });
        this.client.connect();
    }

    /**
     * Returnează obiectul Client pg.
     * @returns {Client}
     * @throws {Error} Dacă clasa nu a fost instanțiată.
     */
    getClient() {
        if (!AccesBD.#instanta)
            throw new Error("AccesBD nu a fost instanțiat.");
        return this.client;
    }

    /**
     * Returnează instanța unică a clasei, creând-o dacă nu există.
     * @param {Object} [options]
     * @param {string} [options.init="local"] - Tipul de inițializare
     * @returns {AccesBD}
     */
    static getInstanta({ init = "local" } = {}) {
        if (!this.#instanta) {
            this.#initializat = true;
            this.#instanta = new AccesBD();
            try {
                switch (init) {
                    case "local": this.#instanta.initLocal(); break;
                }
            } catch (e) {
                console.error("Eroare la inițializarea bazei de date:", e.message);
            }
        }
        return this.#instanta;
    }

    /**
     * @typedef {Object} ObiectQuerySelect
     * @property {string} tabel - Numele tabelului
     * @property {string[]} campuri - Coloanele de selectat (poate include "*")
     * @property {string[]|string[][]} conditiiAnd - Condiții WHERE: array flat → AND; vector de vectori → AND intern, OR extern
     */

    /**
     * @callback QueryCallback
     * @param {Error|null} err - Eroare dacă a apărut una
     * @param {Object|null} rez - Rezultatul query-ului
     */

    /**
     * Selectează înregistrări din baza de date.
     * @param {ObiectQuerySelect} obj
     * @param {QueryCallback} callback
     * @param {Array} [parametriQuery=[]] - Parametri pentru query parametrizat
     */
    select({ tabel = "", campuri = [], conditiiAnd = [] } = {}, callback, parametriQuery = []) {
        let comanda = `select ${campuri.join(",")} from ${tabel} ${buildWhere(conditiiAnd)}`;
        this.client.query(comanda, parametriQuery, callback);
    }

    /**
     * Selectează înregistrări asincron.
     * @param {ObiectQuerySelect} obj
     * @returns {Promise<Object|null>} Rezultatul query-ului sau null la eroare
     */
    async selectAsync({ tabel = "", campuri = [], conditiiAnd = [] } = {}) {
        let comanda = `select ${campuri.join(",")} from ${tabel} ${buildWhere(conditiiAnd)}`;
        try {
            return await this.client.query(comanda);
        } catch (e) {
            console.error("selectAsync eroare:", e.message);
            return null;
        }
    }

    /**
     * @typedef {Object} ObiectQueryInsert
     * @property {string} tabel - Numele tabelului
     * @property {Object} campuri - Obiect cu perechile câmp-valoare de inserat
     */

    /**
     * Inserează o înregistrare în tabel.
     * @param {ObiectQueryInsert} obj
     * @param {QueryCallback} callback
     */
    insert({ tabel = "", campuri = {} } = {}, callback) {
        let comanda = `insert into ${tabel}(${Object.keys(campuri).join(",")}) values (${Object.values(campuri).map(x => `'${x}'`).join(",")})`;
        this.client.query(comanda, callback);
    }

    /**
     * @typedef {Object} ObiectQueryUpdate
     * @property {string} tabel - Numele tabelului
     * @property {Object} campuri - Obiect cu perechile câmp-valoare de actualizat
     * @property {string[]|string[][]} conditiiAnd - Condiții WHERE: array flat → AND; vector de vectori → AND intern, OR extern
     */

    /**
     * Actualizează înregistrări în tabel.
     * @param {ObiectQueryUpdate} obj
     * @param {QueryCallback} callback
     */
    update({ tabel = "", campuri = {}, conditiiAnd = [] } = {}, callback) {
        let setClause = Object.keys(campuri).map(k => `${k}='${campuri[k]}'`).join(", ");
        let comanda = `update ${tabel} set ${setClause} ${buildWhere(conditiiAnd)}`;
        this.client.query(comanda, callback);
    }

    /**
     * @typedef {Object} ObiectQueryDelete
     * @property {string} tabel - Numele tabelului
     * @property {string[]|string[][]} conditiiAnd - Condiții WHERE: array flat → AND; vector de vectori → AND intern, OR extern
     */

    /**
     * Șterge înregistrări din tabel.
     * @param {ObiectQueryDelete} obj
     * @param {QueryCallback} callback
     */
    delete({ tabel = "", conditiiAnd = [] } = {}, callback) {
        let comanda = `delete from ${tabel} ${buildWhere(conditiiAnd)}`;
        this.client.query(comanda, callback);
    }

    /**
     * Execută un query SQL direct.
     * @param {string} comanda - Comanda SQL
     * @param {QueryCallback} callback
     */
    query(comanda, callback) {
        this.client.query(comanda, callback);
    }
}

module.exports = AccesBD;
