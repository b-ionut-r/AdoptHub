const Drepturi = require("./drepturi.js");

/**
 * Clasa de bază pentru roluri. Nu se instanțiază direct.
 */
class Rol {
    static get tip() { return "generic"; }
    static get drepturi() { return []; }

    constructor() {
        this.cod = this.constructor.tip;
    }

    /**
     * Verifică dacă rolul are dreptul dat.
     * @param {Symbol} drept - Un simbol din Drepturi
     * @returns {boolean}
     */
    areDreptul(drept) {
        return this.constructor.drepturi.includes(drept);
    }
}

/**
 * Rol cu toate drepturile (administrator).
 */
class RolAdmin extends Rol {
    static get tip() { return "admin"; }

    constructor() { super(); }

    /** @returns {boolean} Întotdeauna true */
    areDreptul() { return true; }
}

/**
 * Rol cu drepturi de gestionare utilizatori, fără drepturi asupra animalelor.
 */
class RolModerator extends Rol {
    static get tip() { return "moderator"; }
    static get drepturi() {
        return [
            Drepturi.vizualizareUtilizatori,
            Drepturi.stergereUtilizatori,
            Drepturi.modificareUtilizatori,
        ];
    }

    constructor() { super(); }
}

/**
 * Rol pentru utilizatorul logat (client).
 */
class RolClient extends Rol {
    static get tip() { return "comun"; }
    static get drepturi() {
        return [
            Drepturi.vizualizareAnimale,
            Drepturi.adoptareAnimal,
        ];
    }

    constructor() { super(); }
}

/**
 * Fabrică pentru crearea obiectelor de tip Rol.
 */
class RolFactory {
    /**
     * Creează un obiect Rol corespunzător codului dat.
     * @param {string} tip - Codul rolului ("admin", "moderator", "comun")
     * @returns {Rol|undefined}
     */
    static creeazaRol(tip) {
        switch (tip) {
            case RolAdmin.tip:     return new RolAdmin();
            case RolModerator.tip: return new RolModerator();
            case RolClient.tip:    return new RolClient();
        }
    }
}

module.exports = { Rol, RolFactory };
