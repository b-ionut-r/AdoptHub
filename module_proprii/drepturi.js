/**
 * @typedef {Object} Drepturi
 * @property {Symbol} vizualizareUtilizatori - Dreptul de a vedea lista utilizatorilor
 * @property {Symbol} stergereUtilizatori - Dreptul de a șterge utilizatori
 * @property {Symbol} modificareUtilizatori - Dreptul de a modifica utilizatori
 * @property {Symbol} vizualizareAnimale - Dreptul de a vizualiza animale disponibile
 * @property {Symbol} adaugareAnimal - Dreptul de a adăuga un animal nou
 * @property {Symbol} modificareAnimal - Dreptul de a modifica datele unui animal
 * @property {Symbol} stergereAnimal - Dreptul de a șterge un animal
 * @property {Symbol} adoptareAnimal - Dreptul de a adopta un animal
 */

/** @type {Drepturi} */
const Drepturi = {
    vizualizareUtilizatori: Symbol("vizualizareUtilizatori"),
    stergereUtilizatori:    Symbol("stergereUtilizatori"),
    modificareUtilizatori:  Symbol("modificareUtilizatori"),
    vizualizareAnimale:     Symbol("vizualizareAnimale"),
    adaugareAnimal:         Symbol("adaugareAnimal"),
    modificareAnimal:       Symbol("modificareAnimal"),
    stergereAnimal:         Symbol("stergereAnimal"),
    adoptareAnimal:         Symbol("adoptareAnimal"),
};

module.exports = Drepturi;
