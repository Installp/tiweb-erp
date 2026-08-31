// utils.js
// Funções utilitárias compartilhadas por todos os módulos do ERP.
// Centralizar aqui evita duplicação e garante que uma correção
// (ex: formatação de moeda, escape de HTML) valha para o sistema todo.

/**
 * Escapa caracteres especiais de HTML antes de inserir texto dinâmico
 * via innerHTML. Evita que dados vindos do Firestore (nome de cliente,
 * descrição de serviço, etc.) sejam interpretados como HTML/JS (XSS).
 *
 * Uso: sempre que for interpolar um valor de dado (não controlado por
 * você, o programador) dentro de uma template string que vai para innerHTML.
 */
export function escapeHTML(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Formata um número como moeda brasileira (R$).
 */
export function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

/**
 * Arredonda valores monetários para 2 casas decimais de forma segura,
 * evitando erros clássicos de ponto flutuante em JS
 * (ex: 0.1 + 0.2 = 0.30000000000000004).
 *
 * Use isso ao SOMAR ou CALCULAR valores em R$, não apenas ao exibir.
 */
export function arredondaMoeda(valor) {
    const num = Number(valor) || 0;
    // Corrige o erro de ponto flutuante trabalhando em centavos (inteiros)
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Soma uma lista de valores monetários com arredondamento seguro em
 * cada passo, evitando o acúmulo de erro de ponto flutuante.
 */
export function somaMoeda(valores) {
    return arredondaMoeda(valores.reduce((acc, v) => arredondaMoeda(acc + (Number(v) || 0)), 0));
}

/**
 * Mostra um toast (aviso não bloqueante) no canto da tela, para dar
 * feedback ao usuário sem usar alert() (que trava a interface).
 * tipo: 'sucesso' | 'erro' | 'info'
 */
export function mostrarToast(mensagem, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;max-width:320px;';
        document.body.appendChild(container);
    }

    const cores = {
        sucesso: { bg: '#064e3b', border: '#10b981', texto: '#d1fae5' },
        erro: { bg: '#450a0a', border: '#ef4444', texto: '#fecaca' },
        info: { bg: '#1e293b', border: '#3b82f6', texto: '#dbeafe' }
    };
    const cor = cores[tipo] || cores.info;

    const toast = document.createElement('div');
    toast.style.cssText = `background:${cor.bg};border:1px solid ${cor.border};color:${cor.texto};padding:0.75rem 1rem;border-radius:0.5rem;font-size:0.8rem;box-shadow:0 4px 12px rgba(0,0,0,0.3);animation:toast-in 0.2s ease-out;`;
    toast.textContent = mensagem;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease-out';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
