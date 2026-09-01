// relatorios.js

        import { carregarMenuLateral } from './menu.js';
        
        // 1. CARREGA O MENU LATERAL INDEPENDENTE
        carregarMenuLateral();

        // 2. RENDERIZA OS ÍCONES NATIVOS DA TELA
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // 3. FIREBASE E LÓGICA DO RELATÓRIO
        import { auth, db } from './firebase-config.js';
        import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { escapeHTML, formatarMoeda, mostrarToast, arredondaMoeda } from './utils.js';

        let cacheOS = [];
        let cacheClientes = [];
        let cacheFinanceiro = [];
        let cacheServicos = [];
        let cacheDespesas = [];

        let relatorioAtual = 'dre';

        // CHECAR AUTENTICAÇÃO
        onAuthStateChanged(auth, async (user) => {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) loadingScreen.classList.add('hidden');

            if (user) {
                document.getElementById('app-dashboard').classList.remove('hidden');
                await carregarTodosOsDados();
                filtrarPeriodo('mes_atual');
            } else {
                window.location.href = 'index.html';
            }
        });

        // NAVEGAÇÃO E UTILS
        window.irPara = function(pagina) {
            const paginaAtual = window.location.pathname.split('/').pop().toLowerCase();
            const paginaAlvo = pagina.toLowerCase();
            if (paginaAtual === paginaAlvo) return;
            window.location.href = pagina;
        }

        // DELEGAÇÃO DO EVENTO DE LOGOUT (DO MENU.JS)
        document.body.addEventListener('click', (e) => {
            const btnOut = e.target.closest('#btn-logout-global');
            if (btnOut) {
                signOut(auth).then(() => { window.location.href = 'index.html'; });
            }
        });

        // CARREGAMENTO OTIMIZADO DOS DADOS (Promise.all)
        async function carregarTodosOsDados() {
            try {
                const [snapOS, snapC, snapFin, snapS, snapD] = await Promise.all([
                    getDocs(collection(db, "orcamentos")),
                    getDocs(collection(db, "clientes")),
                    getDocs(collection(db, "financeiro")),
                    getDocs(collection(db, "servicos")),
                    getDocs(collection(db, "despesas"))
                ]);

                cacheOS = []; snapOS.forEach(d => cacheOS.push({ id: d.id, ...d.data() }));
                cacheClientes = []; snapC.forEach(d => cacheClientes.push({ id: d.id, ...d.data() }));
                cacheFinanceiro = []; snapFin.forEach(d => cacheFinanceiro.push({ id: d.id, ...d.data() }));
                cacheServicos = []; snapS.forEach(d => cacheServicos.push({ id: d.id, ...d.data() }));
                cacheDespesas = []; snapD.forEach(d => cacheDespesas.push({ id: d.id, ...d.data() }));
                
            } catch (err) {
                console.error("Erro ao carregar bases para relatórios:", err);
                mostrarToast("Ocorreu um erro ao carregar os dados financeiros. Tente recarregar a página.", 'erro');
            }
        }

        function parseDataBR(dataStr) {
            if (!dataStr) return null;
            if (dataStr.includes('/')) {
                const p = dataStr.split('/');
                return new Date(p[2], p[1] - 1, p[0]);
            }
            if (dataStr.includes('-')) {
                const p = dataStr.split('-');
                return new Date(p[0], p[1] - 1, p[2]);
            }
            return null;
        }

        // ALTERAÇÃO DE ABAS
        window.trocarRelatorio = function(tipo) {
            relatorioAtual = tipo;
            const secoes = ['dre', 'os', 'clientes', 'financeiro', 'servicos'];
            secoes.forEach(s => document.getElementById(`rel-sec-${s}`).classList.add('hidden'));
            
            // Reseta todos os botões (Mantendo as tags <i> do Lucide intactas)
            secoes.forEach(s => {
                const btn = document.getElementById(`btn-rel-${s}`);
                if (btn) btn.className = "px-3 py-2 rounded-lg text-gray-400 hover:bg-darkbg hover:text-white transition-colors flex items-center gap-2";
            });

            // Ativa o botão selecionado
            document.getElementById(`rel-sec-${tipo}`).classList.remove('hidden');
            const btnAtivo = document.getElementById(`btn-rel-${tipo}`);
            if (btnAtivo) {
                btnAtivo.className = "px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold transition-colors flex items-center gap-2";
            }

            const titulos = {
                dre: { t: "Relatório Financeiro DRE", s: "Análise de resultado líquido do exercício" },
                os: { t: "Relatório de Ordens de Serviço", s: "Histórico completo de atendimentos e status" },
                clientes: { t: "Relatório de Clientes Cadastrados", s: "Listagem de contatos e cadastros corporativos" },
                financeiro: { t: "Relatório de Fluxo Financeiro", s: "Títulos a receber e contas a pagar" },
                servicos: { t: "Relatório do Catálogo de Serviços", s: "Tabela de serviços e valores base" }
            };

            document.getElementById('relatorio-titulo-pagina').innerText = titulos[tipo].t;
            document.getElementById('relatorio-subtitulo-pagina').innerText = titulos[tipo].s;

            // Oculta painel de datas para relatórios que não dependem de tempo
            if (tipo === 'clientes' || tipo === 'servicos') {
                document.getElementById('painel-filtros').classList.add('hidden');
            } else {
                document.getElementById('painel-filtros').classList.remove('hidden');
            }

            filtrarPeriodo('mes_atual');
        }

        // SISTEMA DE FILTROS
        window.filtrarPeriodo = function(tipo) {
            // Realça visualmente o botão de período selecionado
            // (mesmo padrão visual das abas de relatório acima)
            document.querySelectorAll('.btn-periodo').forEach(btn => {
                const ativo = btn.dataset.periodo === tipo;
                btn.className = ativo
                    ? 'btn-periodo px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors border bg-blue-600/20 text-blue-400 border-blue-500/30'
                    : 'btn-periodo px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors border text-gray-400 hover:bg-darkbg hover:text-white border-transparent';
            });

            const hoje = new Date();
            let inicio, fim;

            if (tipo === 'mes_atual') {
                inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
            } else if (tipo === 'mes_anterior') {
                inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            } else if (tipo === 'ano') {
                inicio = new Date(hoje.getFullYear(), 0, 1);
                fim = new Date(hoje.getFullYear(), 11, 31);
            } else {
                inicio = null;
                fim = null;
            }

            processarRelatorios(inicio, fim);
        }

        window.filtrarCustomizado = function() {
            const inVal = document.getElementById('filtro-inicio').value;
            const fimVal = document.getElementById('filtro-fim').value;

            if (!inVal || !fimVal) {
                mostrarToast("Por favor, selecione as duas datas (início e fim) para aplicar o filtro.", 'erro');
                return;
            }

            const inicio = parseDataBR(inVal);
            const fim = parseDataBR(fimVal);
            processarRelatorios(inicio, fim);
        }

        function processarRelatorios(inicio, fim) {
            if (relatorioAtual === 'dre') renderDRE(inicio, fim);
            else if (relatorioAtual === 'os') renderRelOS(inicio, fim);
            else if (relatorioAtual === 'clientes') renderRelClientes();
            else if (relatorioAtual === 'financeiro') renderRelFinanceiro(inicio, fim);
            else if (relatorioAtual === 'servicos') renderRelServicos();
        }

        // RENDERIZAÇÃO DRE (O Coração Financeiro)
        function renderDRE(inicio, fim) {
            let totalOSVal = 0;
            let totalEntradasDirectVal = 0;
            let totalPecasVal = 0;
            let totalDeslocamentoVal = 0;
            let totalDespVeiculoVal = 0;
            let totalDespOutrosVal = 0;

            cacheOS.forEach(os => {
                const dt = parseDataBR(os.data);
                if (!dt) return;
                if (!inicio || (dt >= inicio && dt <= fim)) {
                    totalOSVal = arredondaMoeda(totalOSVal + (Number(os.total) || 0));
                    totalDeslocamentoVal = arredondaMoeda(totalDeslocamentoVal + (Number(os.custoDeslocamento) || 0));
                    if (os.pecas) {
                        os.pecas.forEach(p => { totalPecasVal = arredondaMoeda(totalPecasVal + (Number(p.subtotal) || Number(p.valor) || 0)); });
                    }
                }
            });

            cacheFinanceiro.forEach(f => {
                const dt = parseDataBR(f.vencimento);
                if (!dt) return;
                if (!inicio || (dt >= inicio && dt <= fim)) {
                    if (f.tipo === 'receber' && f.status === 'Pago') totalEntradasDirectVal = arredondaMoeda(totalEntradasDirectVal + (Number(f.valor) || 0));
                    else if (f.tipo === 'pagar' && f.status === 'Pago') totalDespOutrosVal = arredondaMoeda(totalDespOutrosVal + (Number(f.valor) || 0));
                }
            });

            cacheDespesas.forEach(d => {
                if (d.categoria === 'Veículo / Combustível') totalDespVeiculoVal = arredondaMoeda(totalDespVeiculoVal + (Number(d.valor) || 0));
                else totalDespOutrosVal = arredondaMoeda(totalDespOutrosVal + (Number(d.valor) || 0));
            });

            const receitaBruta = arredondaMoeda(totalOSVal + totalEntradasDirectVal);
            const custosDiretos = arredondaMoeda(totalPecasVal + totalDeslocamentoVal);
            const lucroBruto = arredondaMoeda(receitaBruta - custosDiretos);
            const despesasOperacionais = arredondaMoeda(totalDespVeiculoVal + totalDespOutrosVal);
            const lucroLiquidoReal = arredondaMoeda(lucroBruto - despesasOperacionais);

            // Preenche os cards
            document.getElementById('dre-faturamento').innerText = formatarMoeda(receitaBruta);
            document.getElementById('dre-custos').innerText = formatarMoeda(custosDiretos);
            document.getElementById('dre-despesas').innerText = formatarMoeda(despesasOperacionais);
            
            const cardLucro = document.getElementById('dre-lucro-liquido');
            cardLucro.innerText = formatarMoeda(lucroLiquidoReal);
            cardLucro.className = lucroLiquidoReal < 0 ? "text-2xl font-bold text-red-400 mt-1" : "text-2xl font-bold text-blue-400 mt-1";

            // Preenche a tabela estruturada
            document.getElementById('line-receita').innerText = formatarMoeda(receitaBruta);
            document.getElementById('line-custos-total').innerText = formatarMoeda(custosDiretos);
            document.getElementById('line-lucro-bruto').innerText = formatarMoeda(lucroBruto);
            document.getElementById('line-despesas-total').innerText = formatarMoeda(despesasOperacionais);
            
            const lineResultado = document.getElementById('line-resultado-final');
            lineResultado.innerText = formatarMoeda(lucroLiquidoReal);
            lineResultado.className = lucroLiquidoReal < 0 ? "font-mono text-red-400" : "font-mono text-blue-400";
        }

        // RENDERIZAÇÃO OS
        function renderRelOS(inicio, fim) {
            let html = '';
            cacheOS.forEach(o => {
                const dt = parseDataBR(o.data);
                if (!dt) return;
                if (!inicio || (dt >= inicio && dt <= fim)) {
                    html += `<tr class="border-b border-cardborder">
                        <td class="p-3 font-mono text-blue-400 font-bold">${escapeHTML(o.numeroOS) || '-'}</td>
                        <td class="p-3 text-white font-semibold">${escapeHTML(o.clienteNome) || '-'}</td>
                        <td class="p-3">${escapeHTML(o.equipamento) || '-'}</td>
                        <td class="p-3 font-mono">${escapeHTML(o.data) || '-'}</td>
                        <td class="p-3">${escapeHTML(o.status) || '-'}</td>
                        <td class="p-3 text-right font-bold text-emerald-400">${formatarMoeda(o.total)}</td>
                    </tr>`;
                }
            });
            document.getElementById('table-rel-os').innerHTML = html || '<tr><td colspan="6" class="p-6 text-center text-gray-500">Nenhuma Ordem de Serviço encontrada no período.</td></tr>';
        }

        // RENDERIZAÇÃO CLIENTES
        function renderRelClientes() {
            let html = '';
            cacheClientes.forEach(c => {
                html += `<tr class="border-b border-cardborder">
                    <td class="p-3 font-semibold text-white">${escapeHTML(c.nome) || '-'}</td>
                    <td class="p-3">${escapeHTML(c.contato) || '-'}</td>
                    <td class="p-3">${escapeHTML(c.fone) || '-'}</td>
                    <td class="p-3">${escapeHTML(c.email) || '-'}</td>
                    <td class="p-3 font-mono text-gray-400">${escapeHTML(c.docNum) || '-'}</td>
                    <td class="p-3 text-xs">${escapeHTML(c.endereco) || '-'}</td>
                </tr>`;
            });
            document.getElementById('table-rel-clientes').innerHTML = html || '<tr><td colspan="6" class="p-6 text-center text-gray-500">Nenhum cliente cadastrado no sistema.</td></tr>';
        }

        // RENDERIZAÇÃO FINANCEIRO
        function renderRelFinanceiro(inicio, fim) {
            let html = '';
            cacheFinanceiro.forEach(f => {
                const dt = parseDataBR(f.vencimento);
                if (!dt) return;
                if (!inicio || (dt >= inicio && dt <= fim)) {
                    const tipoBadge = f.tipo === 'receber' ? '<span class="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">ENTRADA</span>' : '<span class="text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded">SAÍDA</span>';
                    html += `<tr class="border-b border-cardborder">
                        <td class="p-3">${tipoBadge}</td>
                        <td class="p-3 text-white font-semibold">${escapeHTML(f.descricao) || '-'}</td>
                        <td class="p-3">${escapeHTML(f.entidade) || '-'}</td>
                        <td class="p-3 font-mono">${escapeHTML(f.vencimento) || '-'}</td>
                        <td class="p-3"><span class="px-2.5 py-1 bg-gray-700/50 text-gray-300 rounded text-xs font-medium">${escapeHTML(f.forma) || 'PIX'}</span></td>
                        <td class="p-3 font-semibold ${f.status === 'Pago' ? 'text-emerald-400' : 'text-yellow-400'}">${escapeHTML(f.status) || 'Pendente'}</td>
                        <td class="p-3 text-right font-bold ${f.tipo === 'receber' ? 'text-emerald-400' : 'text-red-400'}">${formatarMoeda(f.valor)}</td>
                    </tr>`;
                }
            });
            document.getElementById('table-rel-financeiro').innerHTML = html || '<tr><td colspan="7" class="p-6 text-center text-gray-500">Nenhum lançamento financeiro no período.</td></tr>';
        }

        // RENDERIZAÇÃO CATÁLOGO
        function renderRelServicos() {
            let html = '';
            cacheServicos.forEach(s => {
                html += `<tr class="border-b border-cardborder">
                    <td class="p-3 font-semibold text-white">${escapeHTML(s.nome) || '-'}</td>
                    <td class="p-3 text-gray-400">${escapeHTML(s.obs) || '-'}</td>
                    <td class="p-3 text-right font-bold text-emerald-400">${formatarMoeda(s.valor)}</td>
                </tr>`;
            });
            document.getElementById('table-rel-servicos').innerHTML = html || '<tr><td colspan="3" class="p-6 text-center text-gray-500">Nenhum serviço cadastrado no catálogo.</td></tr>';
        }
