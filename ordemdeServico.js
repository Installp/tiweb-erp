// ordemdeServico.js

        import { carregarMenuLateral } from './menu.js';
        
        // 1. CARREGA O MENU LATERAL INDEPENDENTE
        carregarMenuLateral();

        // 2. RENDERIZA OS ÍCONES NATIVOS DA TELA
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // 3. LÓGICA DO MÓDULO E FIREBASE
        import { auth, db } from './firebase-config.js';
        import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { escapeHTML, formatarMoeda, mostrarToast, arredondaMoeda } from './utils.js';

        let cacheClientes = [];
        let cacheServicos = [];
        let cacheOrcamentos = [];

        let tempServicos = [];
        let tempPecas = [];
        let clienteSelecionado = null;

        // CHECAR AUTENTICAÇÃO
        onAuthStateChanged(auth, async (user) => {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) loadingScreen.classList.add('hidden');

            if (user) {
                document.getElementById('app-dashboard').classList.remove('hidden');
                await carregarListasBase();
                await carregarOrcamentos();
            } else {
                window.location.href = 'index.html';
            }
        });

        // DELEGAÇÃO DO EVENTO DE LOGOUT (DO MENU.JS)
        document.body.addEventListener('click', (e) => {
            const btnOut = e.target.closest('#btn-logout-global');
            if (btnOut) {
                signOut(auth).then(() => { window.location.href = 'index.html'; });
            }
        });

        // NAVEGAÇÃO E UTILS
        window.irPara = function(pagina) {
            const paginaAtual = window.location.pathname.split('/').pop().toLowerCase();
            const paginaAlvo = pagina.toLowerCase();
            if (paginaAtual === paginaAlvo) return;
            window.location.href = pagina;
        }

        window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.closeModal('modal-orcamento');
            }
        });

        // Fechar dropdowns de autocomplete ao clicar fora
        document.addEventListener('click', function(e) {
            if(!e.target.closest('#o-cliente-search') && !e.target.closest('#o-cliente-resultados')) {
                const el = document.getElementById('o-cliente-resultados');
                if(el) el.classList.add('hidden');
            }
        });

        async function carregarListasBase() {
            try {
                const snapC = await getDocs(collection(db, "clientes"));
                cacheClientes = [];
                snapC.forEach(d => cacheClientes.push({ id: d.id, ...d.data() }));

                const snapS = await getDocs(collection(db, "servicos"));
                cacheServicos = [];
                snapS.forEach(d => cacheServicos.push({ id: d.id, ...d.data() }));

                const selS = document.getElementById('o-servico');
                if (selS) {
                    selS.innerHTML = cacheServicos.length > 0 
                        ? cacheServicos.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(s.nome)} (${formatarMoeda(s.valor)})</option>`).join('')
                        : '<option value="">Nenhum serviço cadastrado no catálogo</option>';
                }
            } catch (err) {
                console.error("Erro ao carregar bases:", err);
            }
        }

        function gerarCodigoOS() {
            const hoje = new Date();
            const ano = String(hoje.getFullYear()).slice(-2);
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            const dia = String(hoje.getDate()).padStart(2, '0');
            const prefixoData = `${ano}${mes}${dia}`;

            const dataHojeFormatada = hoje.toLocaleDateString('pt-BR');
            const ordensDeHoje = cacheOrcamentos.filter(o => o.data === dataHojeFormatada);
            
            const sequencial = String(ordensDeHoje.length + 1).padStart(2, '0');
            return `${prefixoData}${sequencial}`;
        }

        async function carregarOrcamentos() {
            const tableBody = document.getElementById('table-orcamentos');
            try {
                const snapO = await getDocs(collection(db, "orcamentos"));
                cacheOrcamentos = [];
                let html = '';

                snapO.forEach(d => {
                    const item = { id: d.id, ...d.data() };
                    cacheOrcamentos.push(item);

                    let statusBadge = '';
                    if (item.status === 'Concluído') {
                        statusBadge = '<span class="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold">🟢 Concluído</span>';
                    } else if (item.status === 'Em andamento') {
                        statusBadge = '<span class="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold">🔵 Em andamento</span>';
                    } else {
                        statusBadge = '<span class="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-semibold">🟡 Em aberto</span>';
                    }

                    html += `<tr class="border-b border-cardborder hover:bg-darkbg/50 transition-colors">
                        <td class="p-3 font-mono text-blue-400 font-bold">${escapeHTML(item.numeroOS) || '-'}</td>
                        <td class="p-3 font-semibold text-white">${escapeHTML(item.clienteNome) || '-'}</td>
                        <td class="p-3 text-xs text-gray-300">${escapeHTML(item.equipamento) || '-'}</td>
                        <td class="p-3 text-xs font-mono">${escapeHTML(item.data) || '-'}</td>
                        <td class="p-3 font-semibold text-emerald-400">${formatarMoeda(item.total)}</td>
                        <td class="p-3">${statusBadge}</td>
                        <td class="p-3 flex justify-center gap-2">
                            <button type="button" onclick="editarOrcamento('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 text-xs font-semibold transition-colors">✏️ Editar</button>
                            <button type="button" onclick="imprimirOrcamento('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 text-xs font-semibold transition-colors">📄 Imprimir</button>
                            <button type="button" onclick="deletarOrcamento('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs font-semibold transition-colors">🗑️ Excluir</button>
                        </td>
                    </tr>`;
                });

                tableBody.innerHTML = html || '<tr><td colspan="7" class="p-6 text-center text-gray-500 text-sm">Nenhuma Ordem de Serviço registrada.</td></tr>';
            } catch (err) {
                console.error("Erro ao carregar orçamentos:", err);
                tableBody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-red-400">Falha ao carregar Ordens de Serviço.</td></tr>';
            }
        }

        window.novoOrcamentoModal = async function() {
            await carregarListasBase();

            document.getElementById('o-edit-id').value = '';
            document.getElementById('modal-orcamento-titulo').innerText = 'Nova Ordem de Serviço';
            
            const novoNumero = gerarCodigoOS();
            document.getElementById('o-numero-display').innerText = `N° OS: ${novoNumero}`;

            document.getElementById('o-cliente-search').value = '';
            document.getElementById('o-cliente-resultados').innerHTML = '';
            document.getElementById('o-cliente-resultados').classList.add('hidden');
            document.getElementById('o-cliente-selecionado').innerText = '';
            
            document.getElementById('o-equipamento').value = '';
            document.getElementById('o-status').value = 'Em aberto';
            document.getElementById('o-km').value = '';
            document.getElementById('o-peca-nome').value = '';
            document.getElementById('o-peca-valor').value = '';
            document.getElementById('o-peca-qtd').value = '1';
            document.getElementById('o-servico-qtd').value = '1';
            
            clienteSelecionado = null;
            tempServicos = [];
            tempPecas = [];

            renderItensOrcamento();
            document.getElementById('modal-orcamento').classList.remove('hidden');
        }

        window.filtrarClientesOrcamento = function() {
            const query = document.getElementById('o-cliente-search').value.toLowerCase().trim();
            const resDiv = document.getElementById('o-cliente-resultados');

            if (!query) {
                resDiv.classList.add('hidden');
                return;
            }

            const filtrados = cacheClientes.filter(c => 
                (c.nome && c.nome.toLowerCase().includes(query)) ||
                (c.docNum && c.docNum.toLowerCase().includes(query))
            ).slice(0, 10);

            if (filtrados.length > 0) {
                let html = '';
                filtrados.forEach(c => {
                    html += `<div onclick="selecionarClienteDirect('${escapeHTML(c.id)}')" class="p-2.5 border-b border-cardborder hover:bg-blue-600/20 cursor-pointer text-sm transition-colors">
                        <span class="font-bold text-white">${escapeHTML(c.nome)}</span> 
                        <span class="text-xs text-gray-400">${c.docNum ? '('+escapeHTML(c.docNum)+')' : ''}</span>
                    </div>`;
                });
                resDiv.innerHTML = html;
                resDiv.classList.remove('hidden');
            } else {
                resDiv.innerHTML = '<div class="p-2.5 text-xs text-gray-400">Nenhum cliente encontrado</div>';
                resDiv.classList.remove('hidden');
            }
        }

        window.selecionarClienteDirect = function(id) {
            const sel = cacheClientes.find(c => c.id === id);
            if (sel) {
                clienteSelecionado = sel;
                document.getElementById('o-cliente-search').value = sel.nome;
                document.getElementById('o-cliente-selecionado').innerText = `✓ Cliente Selecionado: ${sel.nome}`;
                document.getElementById('o-cliente-resultados').classList.add('hidden');
            }
        }

        window.addServicoOrcamento = function() {
            const selId = document.getElementById('o-servico').value;
            const qtd = parseInt(document.getElementById('o-servico-qtd').value) || 1;
            if (!selId) return;

            const serv = cacheServicos.find(s => s.id === selId);
            if (serv) {
                const unit = Number(serv.valor) || 0;
                tempServicos.push({ nome: serv.nome, qtd: qtd, valorUnit: unit, subtotal: arredondaMoeda(unit * qtd) });
                document.getElementById('o-servico-qtd').value = '1';
                renderItensOrcamento();
            }
        }

        window.addPecaOrcamento = function() {
            const nome = document.getElementById('o-peca-nome').value.trim();
            const qtd = parseInt(document.getElementById('o-peca-qtd').value) || 1;
            const unit = parseFloat(document.getElementById('o-peca-valor').value) || 0;

            if (nome) {
                tempPecas.push({ nome, qtd: qtd, valorUnit: unit, subtotal: arredondaMoeda(unit * qtd) });
                document.getElementById('o-peca-nome').value = '';
                document.getElementById('o-peca-valor').value = '';
                document.getElementById('o-peca-qtd').value = '1';
                renderItensOrcamento();
            }
        }

        window.removerServicoTemp = function(idx) { tempServicos.splice(idx, 1); renderItensOrcamento(); }
        window.removerPecaTemp = function(idx) { tempPecas.splice(idx, 1); renderItensOrcamento(); }

        function renderItensOrcamento() {
            document.getElementById('o-servicos-lista').innerHTML = tempServicos.map((s, idx) => `
                <div class="flex justify-between items-center bg-cardbg p-2 rounded border border-cardborder">
                    <span class="text-white text-xs">${s.qtd}x ${escapeHTML(s.nome)}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-emerald-400 font-bold text-xs">${formatarMoeda(s.subtotal)} <span class="text-gray-500 font-normal">(${s.qtd}x ${formatarMoeda(s.valorUnit)})</span></span>
                        <button type="button" onclick="removerServicoTemp(${idx})" class="text-red-400 hover:text-red-300 font-bold text-sm bg-red-500/10 hover:bg-red-500/20 w-6 h-6 rounded flex items-center justify-center transition-colors">✕</button>
                    </div>
                </div>`).join('');

            document.getElementById('o-pecas-lista').innerHTML = tempPecas.map((p, idx) => `
                <div class="flex justify-between items-center bg-cardbg p-2 rounded border border-cardborder">
                    <span class="text-white text-xs">${p.qtd}x ${escapeHTML(p.nome)}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-emerald-400 font-bold text-xs">${formatarMoeda(p.subtotal)} <span class="text-gray-500 font-normal">(${p.qtd}x ${formatarMoeda(p.valorUnit)})</span></span>
                        <button type="button" onclick="removerPecaTemp(${idx})" class="text-red-400 hover:text-red-300 font-bold text-sm bg-red-500/10 hover:bg-red-500/20 w-6 h-6 rounded flex items-center justify-center transition-colors">✕</button>
                    </div>
                </div>`).join('');

            window.calcularTotalOrcamento();
        }

        window.calcularTotalOrcamento = function() {
            const km = parseFloat(document.getElementById('o-km').value) || 0;
            const custoKM = arredondaMoeda(km * 2.50);
            const totalS = tempServicos.reduce((a, b) => arredondaMoeda(a + (Number(b.subtotal) || Number(b.valor) || 0)), 0);
            const totalP = tempPecas.reduce((a, b) => arredondaMoeda(a + (Number(b.subtotal) || Number(b.valor) || 0)), 0);
            const total = arredondaMoeda(totalS + totalP + custoKM);

            document.getElementById('o-total-txt').innerText = formatarMoeda(total);
            return total;
        }

        // SALVAR ORDEM DE SERVIÇO
        window.salvarOrcamento = async function() {
            if (!clienteSelecionado) {
                mostrarToast("Por favor, localize e selecione um cliente da lista!", 'erro');
                document.getElementById('o-cliente-search').focus();
                return;
            }

            const btnSalvar = document.getElementById('btn-salvar-os');
            btnSalvar.disabled = true;
            btnSalvar.innerText = "⏳ Salvando...";

            const editId = document.getElementById('o-edit-id').value;
            const km = parseFloat(document.getElementById('o-km').value) || 0;
            const total = window.calcularTotalOrcamento();

            let numeroOS = '';
            if (editId) {
                const itemExistente = cacheOrcamentos.find(o => o.id === editId);
                numeroOS = itemExistente ? itemExistente.numeroOS : gerarCodigoOS();
            } else {
                numeroOS = gerarCodigoOS();
            }

            const dados = {
                numeroOS: numeroOS,
                clienteId: clienteSelecionado.id,
                clienteNome: clienteSelecionado.nome,
                clienteFone: clienteSelecionado.fone || '-',
                clienteDoc: clienteSelecionado.docNum || clienteSelecionado.doc || '',
                equipamento: document.getElementById('o-equipamento').value.trim(),
                status: document.getElementById('o-status').value,
                servicos: tempServicos,
                pecas: tempPecas,
                km: km,
                custoDeslocamento: arredondaMoeda(km * 2.50),
                total: total,
                data: editId ? (cacheOrcamentos.find(o => o.id === editId)?.data || new Date().toLocaleDateString('pt-BR')) : new Date().toLocaleDateString('pt-BR')
            };

            try {
                if (editId) {
                    await updateDoc(doc(db, "orcamentos", editId), dados);
                } else {
                    await addDoc(collection(db, "orcamentos"), dados);
                }
                closeModal('modal-orcamento');
                await carregarOrcamentos();
                mostrarToast('Ordem de Serviço salva com sucesso.', 'sucesso');
            } catch (err) {
                console.error("Erro ao salvar ordem de serviço:", err);
                mostrarToast("Erro ao salvar ordem de serviço. Verifique sua conexão.", 'erro');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerText = "Salvar Ordem de Serviço";
            }
        }

        // EDITAR ORDEM DE SERVIÇO
        window.editarOrcamento = function(id) {
            const item = cacheOrcamentos.find(o => o.id === id);
            if (!item) return;

            document.getElementById('o-edit-id').value = item.id;
            document.getElementById('modal-orcamento-titulo').innerText = 'Editar Ordem de Serviço';
            document.getElementById('o-numero-display').innerText = `N° OS: ${item.numeroOS || ''}`;

            clienteSelecionado = cacheClientes.find(c => c.id === item.clienteId) || { id: item.clienteId, nome: item.clienteNome, fone: item.clienteFone };
            document.getElementById('o-cliente-search').value = item.clienteNome || '';
            document.getElementById('o-cliente-selecionado').innerText = `✓ Cliente: ${item.clienteNome || ''}`;
            document.getElementById('o-cliente-resultados').classList.add('hidden');

            document.getElementById('o-equipamento').value = item.equipamento || '';
            document.getElementById('o-status').value = item.status || 'Em aberto';
            document.getElementById('o-km').value = item.km || '';

            tempServicos = item.servicos ? [...item.servicos] : [];
            tempPecas = item.pecas ? [...item.pecas] : [];

            renderItensOrcamento();
            document.getElementById('modal-orcamento').classList.remove('hidden');
        }

        // EXCLUIR ORDEM DE SERVIÇO
        window.deletarOrcamento = async function(id) {
            if (confirm("Tem certeza que deseja excluir esta Ordem de Serviço permanentemente?")) {
                try {
                    await deleteDoc(doc(db, "orcamentos", id));
                    await carregarOrcamentos();
                    mostrarToast('Ordem de Serviço excluída.', 'sucesso');
                } catch (err) {
                    console.error("Erro ao excluir OS:", err);
                    mostrarToast("Erro ao excluir Ordem de Serviço. Verifique suas permissões.", 'erro');
                }
            }
        }

        // IMPRESSÃO (Recibo/Comprovante)
        window.imprimirOrcamento = async function(id) {
            const item = cacheOrcamentos.find(o => o.id === id);
            if (!item) return;

            // Busca dados da empresa
            let empresa = {};
            try {
                const docRef = doc(db, "configuracoes", "empresa");
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    empresa = snap.data();
                    localStorage.setItem('dados_empresa', JSON.stringify(empresa));
                } else {
                    throw new Error("Doc não encontrado");
                }
            } catch (err) {
                const localData = localStorage.getItem('dados_empresa');
                if (localData) {
                    try { empresa = JSON.parse(localData); } catch (e) { empresa = {}; }
                }
            }

            const empresaNome = empresa.nome || 'INSTALL PLACE';
            const empresaTel = empresa.telefones || '';
            const empresaEnd = empresa.endereco || '';
            const empresaDoc = empresa.cnpj || '';
            const empresaEmail = empresa.email || '';

            let printArea = document.getElementById('print-area');
            if (!printArea) {
                printArea = document.createElement('div');
                printArea.id = 'print-area';
                document.body.appendChild(printArea);
            }

            let htmlItens = '';

            if (item.servicos && item.servicos.length > 0) {
                item.servicos.forEach(s => {
                    htmlItens += `<tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">Serviço: ${escapeHTML(s.nome)}</td>
                        <td style="padding: 8px; text-align: center;">${s.qtd || 1}</td>
                        <td style="padding: 8px; text-align: right;">${formatarMoeda(s.valorUnit)}</td>
                        <td style="padding: 8px; text-align: right;">${formatarMoeda(s.subtotal)}</td>
                    </tr>`;
                });
            }

            if (item.pecas && item.pecas.length > 0) {
                item.pecas.forEach(p => {
                    htmlItens += `<tr style="border-bottom: 1px solid #ddd;">
                        <td style="padding: 8px;">Peça/Insumo: ${escapeHTML(p.nome)}</td>
                        <td style="padding: 8px; text-align: center;">${p.qtd || 1}</td>
                        <td style="padding: 8px; text-align: right;">${formatarMoeda(p.valorUnit)}</td>
                        <td style="padding: 8px; text-align: right;">${formatarMoeda(p.subtotal)}</td>
                    </tr>`;
                });
            }

            if (item.km && item.km > 0) {
                const custoKmTotal = item.custoDeslocamento || (item.km * 2.50);
                htmlItens += `<tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px;">Deslocamento (${item.km} km rodados)</td>
                    <td style="padding: 8px; text-align: center;">${item.km}</td>
                    <td style="padding: 8px; text-align: right;">R$ 2,50</td>
                    <td style="padding: 8px; text-align: right;">${formatarMoeda(custoKmTotal)}</td>
                </tr>`;
            }

            printArea.innerHTML = `
                <div style="font-family: Arial, sans-serif; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; background: #fff;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px;">
                        <div>
                            <h1 style="font-size: 20px; font-weight: bold; margin: 0;">${escapeHTML(empresaNome)}</h1>
                            <p style="font-size: 12px; margin: 2px 0;">Suporte Técnico & Soluções de TI</p>
                            ${empresaDoc ? `<p style="font-size: 11px; margin: 2px 0;">CNPJ/CPF: ${escapeHTML(empresaDoc)}</p>` : ''}
                            ${empresaTel ? `<p style="font-size: 11px; margin: 2px 0;">Tel: ${escapeHTML(empresaTel)}</p>` : ''}
                            ${empresaEmail ? `<p style="font-size: 11px; margin: 2px 0;">${escapeHTML(empresaEmail)}</p>` : ''}
                            ${empresaEnd ? `<p style="font-size: 11px; margin: 2px 0;">${escapeHTML(empresaEnd)}</p>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <h2 style="font-size: 16px; font-weight: bold; margin: 0;">ORDEM DE SERVIÇO</h2>
                            <p style="font-size: 14px; font-weight: bold; color: #2563eb; margin: 2px 0;">N°: ${escapeHTML(item.numeroOS) || '-'}</p>
                            <p style="font-size: 11px; margin: 2px 0;">Data: ${escapeHTML(item.data) || '-'}</p>
                            <p style="font-size: 11px; font-weight: bold; margin: 2px 0;">Status: ${escapeHTML(item.status) || '-'}</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 15px; font-size: 13px; background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #ddd;">
                        <p style="margin: 4px 0;"><strong>Cliente:</strong> ${escapeHTML(item.clienteNome) || '-'}</p>
                        <p style="margin: 4px 0;"><strong>Contato / Tel:</strong> ${escapeHTML(item.clienteFone) || '-'}${item.clienteDoc ? ' | <strong>Doc:</strong> ' + escapeHTML(item.clienteDoc) : ''}</p>
                        <p style="margin: 4px 0;"><strong>Equipamento / Defeito:</strong> ${escapeHTML(item.equipamento) || 'Nenhum equipamento informado'}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
                        <thead>
                            <tr style="background: #eee; border-bottom: 2px solid #333;">
                                <th style="padding: 8px; text-align: left;">Descrição do Item / Serviço</th>
                                <th style="padding: 8px; text-align: center;">Qtd</th>
                                <th style="padding: 8px; text-align: right;">Valor Unit.</th>
                                <th style="padding: 8px; text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${htmlItens || '<tr><td colspan="4" style="padding: 10px; text-align: center;">Nenhum item lançado.</td></tr>'}
                        </tbody>
                    </table>

                    <div style="text-align: right; font-size: 15px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-bottom: 40px;">
                        VALOR TOTAL DA OS: ${formatarMoeda(item.total)}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; font-size: 11px; text-align: center; margin-top: 50px;">
                        <div style="border-top: 1px solid #333; width: 45%; padding-top: 5px;">Assinatura do Técnico</div>
                        <div style="border-top: 1px solid #333; width: 45%; padding-top: 5px;">Assinatura do Cliente</div>
                    </div>
                </div>
            `;

            printArea.classList.remove('hidden');
            window.print();
            
            // Oculta após janela de impressão fechar
            window.onafterprint = function() {
                printArea.classList.add('hidden');
            };
        }
