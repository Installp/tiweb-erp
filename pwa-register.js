// pwa-register.js
// Registra o Service Worker (funcionamento offline básico) em todas as
// páginas do sistema. Sem isso, o navegador/Android não considera o
// site "instalável" como aplicativo.

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.error('Falha ao registrar o Service Worker:', err);
        });
    });
}

// Captura o evento que o Android dispara quando o site é "instalável",
// e guarda para poder mostrar um botão "Instalar App" customizado
// (em vez de depender só do menu do navegador).
window.deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window.deferredInstallPrompt = event;
    window.dispatchEvent(new CustomEvent('pwa-instalavel'));
});

// Função que qualquer página pode chamar (ex: num botão "Instalar App")
// para disparar o prompt nativo de instalação do Android.
window.instalarApp = async function () {
    if (!window.deferredInstallPrompt) return false;
    window.deferredInstallPrompt.prompt();
    const resultado = await window.deferredInstallPrompt.userChoice;
    window.deferredInstallPrompt = null;
    return resultado.outcome === 'accepted';
};
