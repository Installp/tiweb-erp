import { auth } from './firebase-config.js';

// Executa a verificação em tempo real no Firebase
auth.onAuthStateChanged((user) => {
    const paginaAtual = window.location.pathname.split('/').pop();
    
    // Se NÃO estiver logado e a página NÃO for a index.html, expulsa para a login
    if (!user && paginaAtual !== 'index.html' && paginaAtual !== '') {
        console.warn("Acesso não autorizado. Redirecionando para o login...");
        window.location.href = 'index.html';
    }
});