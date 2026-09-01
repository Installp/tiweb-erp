// servicos.js

        import { carregarMenuLateral } from './menu.js';
        
        // 1. CARREGA O MENU LATERAL INDEPENDENTE
        carregarMenuLateral();

        // 2. RENDERIZA OS ÍCONES NATIVOS DA TELA
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // 3. FIREBASE & LÓGICA
        import { auth, db } from './firebase-config.js';
        import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { escapeHTML, formatarMoeda, mostrarToast } from './utils.js';

        let cacheServicos = [];

        // CHECAR AUTENTICAÇÃO
        onAuthStateChanged(auth, (user) => {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) loadingScreen.classList.add('hidden');

            if (user) {
                document.getElementById('app-dashboard').classList.remove('hidden');
                carregarServicos();
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
                window.closeModal('modal-servico');
            }
        });

        // ABRIR MODAL VAZIO (NOVO SERVIÇO)
        window.abrirModalNovoServico = function() {
            document.getElementById('form-servico').reset();
            document.getElementById('s-id').value = '';
            document.getElementById('modal-servico-titulo').innerText = 'Cadastrar Novo Serviço';
            document.getElementById('modal-servico').classList.remove('hidden');
        }

        // CARREGAR SERVIÇOS DO FIRESTORE
        async function carregarServicos() {
            try {
                const snap = await getDocs(collection(db, "servicos"));
                cacheServicos = [];
                snap.forEach(d => {
                    cacheServicos.push({ id: d.id, ...d.data() });
                });
                renderTabelaServicos(cacheServicos);
            } catch (err) {
                console.error("Erro ao buscar serviços:", err);
                document.getElementById('table-servicos').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-400">Falha ao carregar catálogo.</td></tr>';
            }
        }

        // RENDERIZAR TABELA
        function renderTabelaServicos(lista) {
            let html = '';
            if (lista.length === 0) {
                html = `<tr><td colspan="4" class="p-6 text-center text-gray-500">Nenhum serviço cadastrado no catálogo.</td></tr>`;
            } else {
                lista.forEach(item => {
                    html += `<tr class="border-b border-cardborder hover:bg-darkbg/50 transition-colors">
                        <td class="p-3 font-semibold text-white">${escapeHTML(item.nome) || '-'}</td>
                        <td class="p-3 text-gray-400 text-xs">${escapeHTML(item.obs) || '-'}</td>
                        <td class="p-3 font-semibold text-emerald-400">${formatarMoeda(item.valor)}</td>
                        <td class="p-3 flex justify-center gap-2">
                            <button type="button" onclick="editarServico('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 text-xs font-semibold transition-colors">✏️ Editar</button>
                            <button type="button" onclick="deletarServico('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs font-semibold transition-colors">🗑️ Excluir</button>
                        </td>
                    </tr>`;
                });
            }
            document.getElementById('table-servicos').innerHTML = html;
        }

        // FILTRO DE BUSCA NA TABELA
        window.filtrarTabelaServicos = function() {
            const query = document.getElementById('search-servico').value.toLowerCase().trim();
            const filtrados = cacheServicos.filter(s => 
                (s.nome && s.nome.toLowerCase().includes(query)) ||
                (s.obs && s.obs.toLowerCase().includes(query))
            );
            renderTabelaServicos(filtrados);
        }

        // SALVAR (CRIAR OU ATUALIZAR)
        window.salvarServico = async function(e) {
            e.preventDefault();
            
            const btnSalvar = document.getElementById('btn-salvar-servico');
            btnSalvar.disabled = true;
            btnSalvar.innerText = "⏳ Salvando...";

            const id = document.getElementById('s-id').value;
            const dados = {
                nome: document.getElementById('s-nome').value.trim(),
                obs: document.getElementById('s-obs').value.trim(),
                valor: parseFloat(document.getElementById('s-valor').value) || 0
            };

            if (!dados.nome) {
                mostrarToast('Informe o nome do serviço.', 'erro');
                btnSalvar.disabled = false;
                btnSalvar.innerText = "Salvar Serviço";
                return;
            }

            try {
                if (id) {
                    await updateDoc(doc(db, "servicos", id), dados);
                } else {
                    await addDoc(collection(db, "servicos"), dados);
                }
                window.closeModal('modal-servico');
                mostrarToast('Serviço salvo com sucesso.', 'sucesso');
                carregarServicos();
            } catch (err) {
                console.error("Erro ao salvar serviço:", err);
                mostrarToast('Ocorreu um erro ao salvar o serviço. Verifique a conexão.', 'erro');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerText = "Salvar Serviço";
            }
        }

        // EDITAR
        window.editarServico = function(id) {
            const servico = cacheServicos.find(s => s.id === id);
            if (!servico) return;

            document.getElementById('s-id').value = servico.id;
            document.getElementById('s-nome').value = servico.nome || '';
            document.getElementById('s-obs').value = servico.obs || '';
            document.getElementById('s-valor').value = servico.valor || '';

            document.getElementById('modal-servico-titulo').innerText = 'Editar Serviço';
            document.getElementById('modal-servico').classList.remove('hidden');
        }

        // EXCLUIR
        window.deletarServico = async function(id) {
            if (confirm("Tem certeza que deseja excluir este serviço permanentemente do catálogo?")) {
                try {
                    await deleteDoc(doc(db, "servicos", id));
                    mostrarToast('Serviço excluído.', 'sucesso');
                    carregarServicos();
                } catch (err) {
                    console.error("Erro ao excluir serviço:", err);
                    mostrarToast('Erro ao excluir o serviço. Tente novamente.', 'erro');
                }
            }
        }
