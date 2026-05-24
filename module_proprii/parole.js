let sirAlphaNum = "";
const v_intervale = [[48, 57], [65, 90], [97, 122]];
for (let interval of v_intervale)
    for (let i = interval[0]; i <= interval[1]; i++)
        sirAlphaNum += String.fromCharCode(i);

/**
 * Generează un token alfanumeric aleatoriu.
 * @param {number} n - Lungimea token-ului
 * @returns {string} Token-ul generat
 */
function genereazaToken(n) {
    let token = "";
    for (let i = 0; i < n; i++)
        token += sirAlphaNum[Math.floor(Math.random() * sirAlphaNum.length)];
    return token;
}

module.exports.genereazaToken = genereazaToken;
