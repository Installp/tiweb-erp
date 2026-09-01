// financeiro.js

        import { carregarMenuLateral } from './menu.js';
        
        // 1. CARREGA O MENU LATERAL INDEPENDENTE
        carregarMenuLateral();

        // 2. RENDERIZA OS ÍCONES NATIVOS DA TELA
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // 3. FIREBASE E LÓGICA
        import { auth, db } from './firebase-config.js';
        import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { escapeHTML, formatarMoeda, mostrarToast, arredondaMoeda } from './utils.js';

        let cacheFinanceiro = [];
        let cacheOS = [];
        let cacheClientes = [];

        // CHECAR AUTENTICAÇÃO
        onAuthStateChanged(auth, async (user) => {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) loadingScreen.classList.add('hidden');

            if (user) {
                document.getElementById('app-dashboard').classList.remove('hidden');
                await carregarBasesConsulta();
                await carregarFinanceiro();
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

        window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); }
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.closeModal('modal-financeiro');
            }
        });

        function formatarDataBR(dataIso) {
            if (!dataIso) return '-';
            const partes = dataIso.split('-');
            if (partes.length === 3) {
                return `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
            return dataIso;
        }

        // GESTÃO DE ABAS
        window.navFin = function(aba) {
            document.getElementById('sec-receber').classList.add('hidden');
            document.getElementById('sec-pagar').classList.add('hidden');

            const btnReceber = document.getElementById('btn-tab-receber');
            const btnPagar = document.getElementById('btn-tab-pagar');

            // Reset estilos
            btnReceber.className = "px-5 py-2 text-sm font-bold rounded-md text-gray-400 hover:text-white hover:bg-darkbg transition-colors flex items-center gap-2";
            btnPagar.className = "px-5 py-2 text-sm font-bold rounded-md text-gray-400 hover:text-white hover:bg-darkbg transition-colors flex items-center gap-2";

            if (aba === 'receber') {
                document.getElementById('sec-receber').classList.remove('hidden');
                btnReceber.className = "px-5 py-2 text-sm font-bold rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-2";
            } else {
                document.getElementById('sec-pagar').classList.remove('hidden');
                btnPagar.className = "px-5 py-2 text-sm font-bold rounded-md bg-red-600/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-2";
            }
        }

        // CARREGAMENTO DE DADOS
        async function carregarBasesConsulta() {
            try {
                const snapOS = await getDocs(collection(db, "orcamentos")); // Aqui antes estava "os", mas o correto no seu Firebase é "orcamentos"
                cacheOS = [];
                snapOS.forEach(d => cacheOS.push({ id: d.id, ...d.data() }));

                const snapC = await getDocs(collection(db, "clientes"));
                cacheClientes = [];
                snapC.forEach(d => cacheClientes.push({ id: d.id, ...d.data() }));
            } catch (err) {
                console.error("Erro ao carregar bases para busca:", err);
            }
        }

        // AUTOCOMPLETES
        window.buscarOSAuto = function() {
            const query = document.getElementById('f-descricao').value.toLowerCase().trim();
            const resDiv = document.getElementById('f-os-results');

            if (!query) {
                resDiv.classList.add('hidden');
                return;
            }

            const filtrados = cacheOS.filter(o => 
                (o.numeroOS && o.numeroOS.toLowerCase().includes(query)) || // Ajustado para "numeroOS" que é o campo real
                (o.clienteNome && o.clienteNome.toLowerCase().includes(query)) // Ajustado para "clienteNome"
            ).slice(0, 10);

            if (filtrados.length > 0) {
                resDiv.innerHTML = filtrados.map(o => `
                    <div onclick="selecionarOSDirect('${escapeHTML(o.id)}')" class="p-2.5 border-b border-cardborder hover:bg-blue-600/20 cursor-pointer text-xs transition-colors">
                        <span class="font-bold text-blue-400">OS ${escapeHTML(o.numeroOS) || 'S/N'}</span> - 
                        <span class="text-white">${escapeHTML(o.clienteNome)}</span> 
                        <span class="text-emerald-400 font-bold ml-1">(${formatarMoeda(o.total)})</span>
                    </div>
                `).join('');
                resDiv.classList.remove('hidden');
            } else {
                resDiv.classList.add('hidden');
            }
        }

        window.selecionarOSDirect = function(id) {
            const os = cacheOS.find(o => o.id === id);
            if (os) {
                document.getElementById('f-descricao').value = `OS ${os.numeroOS || ''}`;
                document.getElementById('f-entidade').value = os.clienteNome || '';
                document.getElementById('f-valor').value = os.total || '';
                document.getElementById('f-os-results').classList.add('hidden');
            }
        }

        window.buscarClienteAuto = function() {
            const query = document.getElementById('f-entidade').value.toLowerCase().trim();
            const resDiv = document.getElementById('f-cliente-results');

            if (!query) {
                resDiv.classList.add('hidden');
                return;
            }

            const filtrados = cacheClientes.filter(c => 
                (c.nome && c.nome.toLowerCase().includes(query)) ||
                (c.docNum && c.docNum.toLowerCase().includes(query))
            ).slice(0, 10);

            if (filtrados.length > 0) {
                resDiv.innerHTML = filtrados.map(c => `
                    <div onclick="selecionarClienteDirect('${escapeHTML(c.id)}')" class="p-2.5 border-b border-cardborder hover:bg-blue-600/20 cursor-pointer text-xs transition-colors">
                        <span class="font-bold text-white">${escapeHTML(c.nome)}</span> 
                        <span class="text-gray-400">${c.docNum ? '('+escapeHTML(c.docNum)+')' : ''}</span>
                    </div>
                `).join('');
                resDiv.classList.remove('hidden');
            } else {
                resDiv.classList.add('hidden');
            }
        }

        window.selecionarClienteDirect = function(id) {
            const c = cacheClientes.find(cli => cli.id === id);
            if (c) {
                document.getElementById('f-entidade').value = c.nome;
                document.getElementById('f-cliente-results').classList.add('hidden');
            }
        }

        // RENDERIZAÇÃO
        async function carregarFinanceiro() {
            try {
                const snap = await getDocs(collection(db, "financeiro"));
                cacheFinanceiro = [];
                snap.forEach(d => cacheFinanceiro.push({ id: d.id, ...d.data() }));

                renderTabelasEGlobalCards(cacheFinanceiro);
            } catch (err) {
                console.error("Erro ao carregar dados financeiros:", err);
                document.getElementById('table-receber').innerHTML = '<tr><td colspan="7" class="p-4 text-center text-red-400">Falha ao carregar dados financeiros.</td></tr>';
                document.getElementById('table-pagar').innerHTML = '<tr><td colspan="7" class="p-4 text-center text-red-400">Falha ao carregar dados financeiros.</td></tr>';
            }
        }

        function renderTabelasEGlobalCards(lista) {
            let totalAReceber = 0;
            let totalRecebido = 0;
            let totalAPagar = 0;
            let totalPago = 0;

            let htmlReceber = '';
            let htmlPagar = '';

            lista.forEach(item => {
                const valor = Number(item.valor) || 0;
                const statusBadge = item.status === 'Pago' 
                    ? '<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">🟢 Concluído</span>'
                    : '<span class="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-semibold">🟡 Pendente</span>';

                const dataBR = formatarDataBR(item.vencimento);
                const isReceber = item.tipo === 'receber';

                const htmlLinha = `
                    <tr class="border-b border-cardborder hover:bg-darkbg/50 transition-colors">
                        <td class="p-3 font-semibold text-white">
                            ${escapeHTML(item.descricao) || '-'}
                            ${item.obs ? `<p class="text-xs text-gray-400 font-normal mt-0.5 truncate max-w-[200px]" title="${escapeHTML(item.obs)}">${escapeHTML(item.obs)}</p>` : ''}
                        </td>
                        <td class="p-3">${escapeHTML(item.entidade) || (isReceber ? '-' : 'Geral')}</td>
                        <td class="p-3 text-xs font-mono">${dataBR}</td>
                        <td class="p-3"><span class="px-2.5 py-1 bg-gray-700/50 text-gray-300 rounded text-xs font-medium">${escapeHTML(item.forma) || 'PIX'}</span></td>
                        <td class="p-3 font-semibold ${isReceber ? 'text-emerald-400' : 'text-red-400'}">${formatarMoeda(valor)}</td>
                        <td class="p-3">${statusBadge}</td>
                        <td class="p-3 flex justify-center gap-2">
                            <button type="button" onclick="editarLancamento('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 text-xs font-semibold transition-colors" title="Editar">✏️ Editar</button>
                            <button type="button" onclick="alternarStatus('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-xs font-semibold transition-colors" title="Alternar Status">🔄 Baixar</button>
                            <button type="button" onclick="deletarLancamento('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs font-semibold transition-colors" title="Excluir">🗑️ Excluir</button>
                        </td>
                    </tr>`;

                if (isReceber) {
                    if (item.status === 'Pago') totalRecebido = arredondaMoeda(totalRecebido + valor);
                    else totalAReceber = arredondaMoeda(totalAReceber + valor);
                    htmlReceber += htmlLinha;
                } else {
                    if (item.status === 'Pago') totalPago = arredondaMoeda(totalPago + valor);
                    else totalAPagar = arredondaMoeda(totalAPagar + valor);
                    htmlPagar += htmlLinha;
                }
            });

            document.getElementById('table-receber').innerHTML = htmlReceber || '<tr><td colspan="7" class="p-6 text-center text-gray-500 text-sm">Nenhum título a receber encontrado.</td></tr>';
            document.getElementById('table-pagar').innerHTML = htmlPagar || '<tr><td colspan="7" class="p-6 text-center text-gray-500 text-sm">Nenhuma conta a pagar encontrada.</td></tr>';

            document.getElementById('card-a-receber').innerText = formatarMoeda(totalAReceber);
            document.getElementById('card-recebido').innerText = formatarMoeda(totalRecebido);
            document.getElementById('card-a-pagar').innerText = formatarMoeda(totalAPagar);
            
            const saldoLiquido = arredondaMoeda(totalRecebido - arredondaMoeda(totalPago + totalAPagar));
            const cardSaldo = document.getElementById('card-saldo');
            cardSaldo.innerText = formatarMoeda(saldoLiquido);
            
            // Colore o saldo de acordo com a positividade
            if(saldoLiquido < 0) {
                cardSaldo.className = "text-2xl font-bold text-red-400 mt-1";
            } else if (saldoLiquido > 0) {
                cardSaldo.className = "text-2xl font-bold text-blue-400 mt-1";
            } else {
                cardSaldo.className = "text-2xl font-bold text-gray-400 mt-1";
            }
        }

        window.filtrarFinanceiro = function() {
            const query = document.getElementById('search-financeiro').value.toLowerCase().trim();
            const filtrados = cacheFinanceiro.filter(f => 
                (f.descricao && f.descricao.toLowerCase().includes(query)) ||
                (f.entidade && f.entidade.toLowerCase().includes(query)) ||
                (f.forma && f.forma.toLowerCase().includes(query)) ||
                (f.status && f.status.toLowerCase().includes(query))
            );
            renderTabelasEGlobalCards(filtrados);
        }

        // CRUD FINANCEIRO
        window.abrirModalNovoLancamento = function(tipo) {
            document.getElementById('form-financeiro').reset();
            document.getElementById('f-id').value = '';
            document.getElementById('f-tipo').value = tipo;
            
            // Define botões customizados baseado no tipo
            const titulo = document.getElementById('modal-fin-titulo');
            const btnSalvar = document.getElementById('btn-salvar-fin');
            
            if(tipo === 'receber') {
                titulo.innerText = 'Novo Título a Receber';
                btnSalvar.className = "px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-600/20 transition-colors";
            } else {
                titulo.innerText = 'Nova Conta a Pagar';
                btnSalvar.className = "px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-red-600/20 transition-colors";
            }

            document.getElementById('f-os-results').classList.add('hidden');
            document.getElementById('f-cliente-results').classList.add('hidden');
            document.getElementById('modal-financeiro').classList.remove('hidden');
        }

        window.salvarLancamento = async function(e) {
            e.preventDefault();
            const btnSalvar = document.getElementById('btn-salvar-fin');
            const id = document.getElementById('f-id').value;
            
            const dados = {
                tipo: document.getElementById('f-tipo').value,
                descricao: document.getElementById('f-descricao').value.trim(),
                entidade: document.getElementById('f-entidade').value.trim(),
                valor: parseFloat(document.getElementById('f-valor').value) || 0,
                vencimento: document.getElementById('f-vencimento').value,
                forma: document.getElementById('f-forma').value,
                status: document.getElementById('f-status').value,
                obs: document.getElementById('f-obs').value.trim()
            };

            if (!dados.descricao) {
                mostrarToast('Informe uma descrição para o lançamento.', 'erro');
                return;
            }
            if (dados.valor <= 0) {
                mostrarToast('Informe um valor válido.', 'erro');
                return;
            }

            try {
                btnSalvar.disabled = true;
                btnSalvar.innerText = "⏳ Salvando...";

                if (id) {
                    await updateDoc(doc(db, "financeiro", id), dados);
                } else {
                    await addDoc(collection(db, "financeiro"), dados);
                }
                
                window.closeModal('modal-financeiro');
                mostrarToast('Lançamento salvo com sucesso.', 'sucesso');
                carregarFinanceiro();
            } catch (err) {
                console.error("Erro ao salvar título:", err);
                mostrarToast('Erro ao salvar lançamento. Tente novamente.', 'erro');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerText = "Salvar Título";
            }
        }

        window.editarLancamento = function(id) {
            const item = cacheFinanceiro.find(f => f.id === id);
            if (!item) return;

            document.getElementById('f-id').value = item.id;
            document.getElementById('f-tipo').value = item.tipo || 'receber';
            document.getElementById('f-descricao').value = item.descricao || '';
            document.getElementById('f-entidade').value = item.entidade || '';
            document.getElementById('f-valor').value = item.valor || '';
            document.getElementById('f-vencimento').value = item.vencimento || '';
            document.getElementById('f-forma').value = item.forma || 'PIX';
            document.getElementById('f-status').value = item.status || 'Pendente';
            document.getElementById('f-obs').value = item.obs || '';

            const titulo = document.getElementById('modal-fin-titulo');
            const btnSalvar = document.getElementById('btn-salvar-fin');
            
            if(item.tipo === 'receber') {
                titulo.innerText = 'Editar Título a Receber';
                btnSalvar.className = "px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-emerald-600/20 transition-colors";
            } else {
                titulo.innerText = 'Editar Conta a Pagar';
                btnSalvar.className = "px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-red-600/20 transition-colors";
            }

            document.getElementById('modal-financeiro').classList.remove('hidden');
        }

        window.alternarStatus = async function(id) {
            const item = cacheFinanceiro.find(f => f.id === id);
            if (!item) return;
            
            const novoStatus = item.status === 'Pago' ? 'Pendente' : 'Pago';
            try {
                await updateDoc(doc(db, "financeiro", id), { status: novoStatus });
                mostrarToast(`Marcado como ${novoStatus}.`, 'sucesso');
                carregarFinanceiro(); // Atualiza a lista e os cards de saldo
            } catch (err) {
                console.error("Erro ao alterar status do título:", err);
                mostrarToast('Erro ao alterar o status.', 'erro');
            }
        }

        window.deletarLancamento = async function(id) {
            if (confirm("Deseja realmente excluir este lançamento financeiro? A ação não poderá ser desfeita.")) {
                try {
                    await deleteDoc(doc(db, "financeiro", id));
                    mostrarToast('Lançamento excluído.', 'sucesso');
                    carregarFinanceiro();
                } catch (err) {
                    console.error("Erro ao deletar lançamento:", err);
                    mostrarToast('Erro ao excluir.', 'erro');
                }
            }
        }
        
        // Fechar dropdowns de autocomplete ao clicar fora
        document.addEventListener('click', function(e) {
            if(!e.target.closest('#f-descricao') && !e.target.closest('#f-os-results')) {
                const el = document.getElementById('f-os-results');
                if(el) el.classList.add('hidden');
            }
            if(!e.target.closest('#f-entidade') && !e.target.closest('#f-cliente-results')) {
                const el = document.getElementById('f-cliente-results');
                if(el) el.classList.add('hidden');
            }
        });
