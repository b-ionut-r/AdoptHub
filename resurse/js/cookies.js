function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name, value, maxAge) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; max-age=' + maxAge + '; path=/';
}

function deleteCookie(name) {
    document.cookie = name + '=; max-age=0; path=/';
}

function deleteAllCookies() {
    document.cookie.split(';').forEach(function(c) {
        var name = c.trim().split('=')[0];
        if (name) deleteCookie(name);
    });
}

window.addEventListener('DOMContentLoaded', function() {
    var banner = document.getElementById('banner-cookies');
    if (banner) {
        if (getCookie('cookies_acceptate')) {
            banner.style.display = 'none';
        } else {
            banner.classList.add('vizibil');
            document.body.classList.add('banner-vizibil');
            document.getElementById('btn-accept-cookies').addEventListener('click', function() {
                setCookie('cookies_acceptate', '1', 86400);
                banner.style.display = 'none';
                document.body.classList.remove('banner-vizibil');
            });
        }
    }

    var infoEl = document.getElementById('ultimul-animal-info');
    if (infoEl) {
        var ultimul = getCookie('ultimul_animal');
        if (ultimul) {
            var sep = ultimul.indexOf('|');
            var id = ultimul.substring(0, sep);
            var nume = decodeURIComponent(ultimul.substring(sep + 1));
            infoEl.innerHTML = 'Ultimul animal vizitat: <a href="/animal/' + id + '">' + nume + '</a>';
        }
    }
});
