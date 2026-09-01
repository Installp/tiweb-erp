// theme-loader.js
// Fonte ÚNICA de verdade para os temas visuais do sistema.
//
// Antes, cada página (index, despesas, financeiro, ordemdeServico,
// relatorios, servicos, configuracao) tinha sua PRÓPRIA cópia idêntica
// desta lógica dentro de um <script> embutido. Agora está centralizada
// aqui: qualquer ajuste de cor/tema é feito em um único lugar.
//
// Como usar em cada página (dentro do <head>, depois do <style id="theme-override">):
//   <script src="theme-loader.js"></script>
//
// Requisitos na página:
//   - Um elemento <style id="theme-override"></style> no <head>.
//   - O container do menu lateral deve ter id="app-sidebar-container".

function obterCSSDoTema(nomeTema) {
    const temas = {
        claro: `
            body { background-color: #f4f5f7 !important; color: #0f172a !important; }
            #app-sidebar-container { background-color: #ffffff !important; border-color: #e2e8f0 !important; }
            .bg-cardbg { background-color: #ffffff !important; border-color: #e2e8f0 !important; box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05) !important; }
            .bg-darkbg { background-color: #f8fafc !important; border-color: #cbd5e1 !important; color: #0f172a !important; }
            .bg-darkbg\\/40, .bg-darkbg\\/50 { background-color: #f1f5f9 !important; }
            .text-white { color: #0f172a !important; }
            .text-gray-400 { color: #64748b !important; }
            .text-gray-300 { color: #334155 !important; }
            input, select, textarea { background-color: #ffffff !important; color: #0f172a !important; border-color: #cbd5e1 !important; }

            /* Estados de hover — antes ficavam escuros mesmo no tema claro */
            .hover\\:bg-darkbg:hover { background-color: #eef2f7 !important; }
            .hover\\:bg-darkbg\\/50:hover { background-color: #eef2f7 !important; }
            .hover\\:text-white:hover { color: #0f172a !important; }
        `,
        cinza: `
            body { background-color: #1a202c !important; color: #f1f5f9 !important; }
            #app-sidebar-container { background-color: #232a37 !important; border-color: #334155 !important; }
            .bg-cardbg { background-color: #232a37 !important; border-color: #334155 !important; box-shadow: 0 2px 4px rgba(0,0,0,0.15) !important; }
            .bg-darkbg { background-color: #1a202c !important; border-color: #475569 !important; color: #f1f5f9 !important; }
            .bg-darkbg\\/40, .bg-darkbg\\/50 { background-color: #161b25 !important; }
            .text-white { color: #ffffff !important; }
            .text-gray-400 { color: #94a3b8 !important; }
            .text-gray-300 { color: #cbd5e1 !important; }
            input, select, textarea { background-color: #1a202c !important; color: #ffffff !important; border-color: #475569 !important; }

            /* Estados de hover */
            .hover\\:bg-darkbg:hover { background-color: #2d3748 !important; }
            .hover\\:bg-darkbg\\/50:hover { background-color: #2d3748 !important; }
            .hover\\:text-white:hover { color: #ffffff !important; }
        `,
        laranja: `
            body { background-color: #fff7ed !important; color: #431407 !important; }
            #app-sidebar-container { background-color: #ffffff !important; border-color: #fed7aa !important; }
            .bg-cardbg { background-color: #ffffff !important; border-color: #fed7aa !important; box-shadow: 0 1px 2px 0 rgba(154, 52, 18, 0.06) !important; }
            .bg-darkbg { background-color: #ffedd5 !important; border-color: #fdba74 !important; color: #431407 !important; }
            .bg-darkbg\\/40, .bg-darkbg\\/50 { background-color: #fff1e0 !important; }
            .text-white { color: #431407 !important; }
            .text-gray-400 { color: #ea580c !important; }
            .text-gray-300 { color: #9a3412 !important; }
            input, select, textarea { background-color: #ffffff !important; color: #431407 !important; border-color: #fed7aa !important; }

            /* Estados de hover */
            .hover\\:bg-darkbg:hover { background-color: #ffe4c7 !important; }
            .hover\\:bg-darkbg\\/50:hover { background-color: #ffe4c7 !important; }
            .hover\\:text-white:hover { color: #431407 !important; }
        `
    };

    return temas[nomeTema] || ''; // tema 'escuro' (padrão) não precisa de override
}

function carregarTemaSalvo() {
    const temaSalvo = localStorage.getItem('theme_preference') || 'escuro';
    const styleTag = document.getElementById('theme-override');
    if (styleTag) {
        styleTag.innerHTML = obterCSSDoTema(temaSalvo);
    }

    // Mantém a classe no body também, para qualquer seletor específico de
    // tema que só exista no style.css. Em algumas páginas (ex: index.html)
    // este script roda no <head>, ANTES do <body> existir — nesse caso,
    // adia essa parte para quando o DOM estiver pronto.
    const aplicarClasseBody = () => {
        if (!document.body) return;
        document.body.classList.remove('theme-claro', 'theme-cinza', 'theme-laranja');
        if (temaSalvo !== 'escuro') {
            document.body.classList.add('theme-' + temaSalvo);
        }
    };

    if (document.body) {
        aplicarClasseBody();
    } else {
        document.addEventListener('DOMContentLoaded', aplicarClasseBody);
    }
}

// Expõe as funções globalmente (usadas pela tela de Configurações para
// pré-visualizar/trocar o tema sem precisar recarregar a página).
window.obterCSSDoTema = obterCSSDoTema;
window.carregarTemaSalvo = carregarTemaSalvo;

carregarTemaSalvo();
