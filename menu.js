// menu.js

export function carregarMenuLateral() {
    let path = window.location.pathname.split('/').pop().toLowerCase();
    if (!path || path === '') path = 'index.html';

    const itensMenu = [
        { nome: 'Dashboard / Home', url: 'index.html', icone: 'layout-dashboard' },
        { nome: 'Clientes', url: 'clientes.html', icone: 'users' },
        { nome: 'Catálogo de Serviços', url: 'servicos.html', icone: 'wrench' },
        { nome: 'Ordens de Serviço / OS', url: 'ordemdeServico.html', icone: 'file-text' },
        { nome: 'Gestão de Despesas', url: 'despesas.html', icone: 'receipt' },
        { nome: 'Financeiro', url: 'financeiro.html', icone: 'dollar-sign' },
        { nome: 'Relatórios & DRE', url: 'relatorios.html', icone: 'pie-chart' },
        { nome: 'Configurações', url: 'configuracao.html', icone: 'settings' }
    ];

    let navHTML = '';

    itensMenu.forEach(item => {
        const isAtivo = path === item.url.toLowerCase();
        const classesCSS = isAtivo 
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold' 
            : 'text-gray-400 hover:bg-darkbg hover:text-white border border-transparent font-medium';

        navHTML += `
            <button onclick="window.location.href='${item.url}'" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${classesCSS}">
                <i data-lucide="${item.icone}" class="w-5 h-5"></i> 
                ${item.nome}
            </button>
        `;
    });

    const sidebarHTML = `
        <div>
            <!-- ÁREA DA LOGO LIVRE (Sem borda e sem fundo) -->
            <div onclick="window.location.href='index.html'" class="flex items-center gap-3 px-2 mb-8 cursor-pointer group">
                <div class="relative flex-shrink-0">
                    <!-- Efeito de brilho suave atrás da logo no hover -->
                    <div class="absolute -inset-1 bg-blue-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                    <!-- Tamanho da logo aumentado para h-14 -->
                    <img src="logo.png" alt="Logo" class="relative h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://via.placeholder.com/100?text=LOGO'">
                </div>
                <div class="flex flex-col">
                    <span class="font-extrabold text-base tracking-wide text-gray-100 group-hover:text-blue-400 transition-colors">
                        TiWEB
                    </span>
                    <div class="flex items-center gap-1.5 mt-1">
                        <!-- Badge da versão -->
                        <span class="px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[10px] font-mono font-semibold text-blue-400">
                            v1.3.0
                        </span>
                        <!-- Indicador de Status -->
                        <span class="flex items-center gap-1 text-[9px] text-gray-400 font-medium uppercase tracking-wider">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]"></span>
                            ERP
                        </span>
                    </div>
                </div>
            </div>

            <!-- NAVEGAÇÃO -->
            <nav class="space-y-1">
                ${navHTML}
            </nav>
        </div>

        <div class="pt-4 border-t border-cardborder mt-auto">
            <button id="btn-logout-global" class="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 hover:bg-darkbg rounded-lg transition-colors">
                <i data-lucide="log-out" class="w-5 h-5"></i> 
                Sair do Sistema
            </button>
        </div>
    `;

    const container = document.getElementById('app-sidebar-container');
    if (container) {
        container.innerHTML = sidebarHTML;
        
        // Renderiza os ícones
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}