const { Sequelize, DataTypes } = require("sequelize");

/**
 * Singleton care gestionează instanța Sequelize și modelele ORM.
 */
class AccesBDSequelize {
    static #instanta = null;

    /**
     * @throws {Error} Dacă se încearcă instanțierea directă.
     */
    constructor() {
        if (AccesBDSequelize.#instanta)
            throw new Error("AccesBDSequelize a fost deja instanțiat.");
    }

    /**
     * Returnează instanța unică, creând-o la primul apel.
     * @returns {AccesBDSequelize}
     */
    static getInstanta() {
        if (!this.#instanta) {
            this.#instanta = new AccesBDSequelize();
            this.#instanta._seq = new Sequelize("adopthub_web", "adopthub_web", "adopthub2025", {
                host:    "localhost",
                port:    5432,
                dialect: "postgres",
                logging: false
            });
            this.#instanta._defineModele();
        }
        return this.#instanta;
    }

    /** @private */
    _defineModele() {
        this.Animal = this._seq.define("animal", {
            id:                { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            nume:              DataTypes.STRING,
            varsta_luni:       DataTypes.INTEGER,
            nivel_energie:     DataTypes.INTEGER,
            talie:             DataTypes.STRING,
            culoare:           DataTypes.STRING,
            trasaturi:         DataTypes.STRING,
            data_inregistrare: DataTypes.DATEONLY,
            vaccinat:          DataTypes.BOOLEAN,
            cale_imagine:      DataTypes.STRING,
            descriere:         DataTypes.TEXT,
            specie:            DataTypes.STRING,
            locatie:           DataTypes.STRING,
            adapost:           DataTypes.STRING
        }, { timestamps: false, tableName: "animal" });

        this.Utilizator = this._seq.define("utilizatori", {
            id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            username: DataTypes.STRING,
            parola:   DataTypes.STRING,
            email:    DataTypes.STRING,
            rol:      DataTypes.STRING,
            nume:     DataTypes.STRING,
            prenume:  DataTypes.STRING,
            poza:     DataTypes.STRING,
            cod:      DataTypes.STRING
        }, { timestamps: false });
    }

    /**
     * Returnează instanța Sequelize brută (pentru raw queries).
     * @returns {Sequelize}
     */
    getSequelize() { return this._seq; }
}

module.exports = AccesBDSequelize;
