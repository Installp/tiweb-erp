// theme-loader.js - Aplica o tema salvo globalmente antes da página renderizar
(function() {
    const tema = localStorage.getItem('theme_preference') || 'escuro';
    if (tema === 'claro') document.body.classList.add('theme-claro');
    else if (tema === 'cinza') document.body.classList.add('theme-cinza');
    else if (tema === 'laranja') document.body.classList.add('theme-laranja');
})();