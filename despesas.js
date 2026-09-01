// despesas.js

        import { carregarMenuLateral } from './menu.js';
        
        // 1. CARREGA O MENU LATERAL INDEPENDENTE
        carregarMenuLateral();

        // 2. RENDERIZA OS ÍCONES NATIVOS DA TELA
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // 3. FIREBASE & LÓGICA DA PÁGINA
        import { auth, db } from './firebase-config.js';
        import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { escapeHTML, formatarMoeda, mostrarToast, arredondaMoeda } from './utils.js';

        let cacheDespesas = [];

        // CHECAR AUTENTICAÇÃO ANTES DE EXIBIR
        onAuthStateChanged(auth, (user) => {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) loadingScreen.classList.add('hidden');

            if (user) {
                document.getElementById('app-dashboard').classList.remove('hidden');
                carregarDespesas(); // Carrega os dados somente se logado
            } else {
                window.location.href = 'index.html';
            }
        });

        // FUNÇÃO DE LOGOUT ATUALIZADA (Delegação de Evento do Menu Dinâmico)
        document.body.addEventListener('click', (e) => {
            const btnOut = e.target.closest('#btn-logout-global');
            if (btnOut) {
                signOut(auth).then(() => {
                    window.location.href = 'index.html';
                });
            }
        });

        // NAVEGAÇÃO
        window.irPara = function(pagina) {
            const paginaAtual = window.location.pathname.split('/').pop().toLowerCase();
            const paginaAlvo = pagina.toLowerCase();
            if (paginaAtual === paginaAlvo) return;
            window.location.href = pagina;
        }

        window.closeModal = function(id) { 
            document.getElementById(id).classList.add('hidden'); 
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.closeModal('modal-despesa');
            }
        });

        // ================= GESTÃO DE DESPESAS =================
        window.abrirModalNovaDespesa = function() {
            document.getElementById('form-despesa').reset();
            document.getElementById('d-id').value = '';
            document.getElementById('modal-despesa-titulo').innerText = 'Registrar Despesa';
            document.getElementById('modal-despesa').classList.remove('hidden');
        }

        window.carregarDespesas = async function() {
            const tableBody = document.getElementById('table-despesas');
            
            try {
                const snap = await getDocs(collection(db, "despesas"));
                cacheDespesas = [];
                let html = '';
                let total = 0;

                snap.forEach(d => {
                    const item = { id: d.id, ...d.data() };
                    cacheDespesas.push(item);
                    total = arredondaMoeda(total + (Number(item.valor) || 0));

                    html += `<tr class="border-b border-cardborder hover:bg-darkbg/50 transition-colors">
                        <td class="p-3 font-semibold text-white">${escapeHTML(item.nome) || '-'}</td>
                        <td class="p-3"><span class="px-2.5 py-1 bg-gray-700/50 border border-gray-600/50 text-gray-300 rounded-full text-xs font-medium">${escapeHTML(item.categoria) || 'Geral'}</span></td>
                        <td class="p-3 font-semibold text-red-400">${formatarMoeda(item.valor)}</td>
                        <td class="p-3 flex justify-center gap-2">
                            <button type="button" onclick="editarDespesa('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 text-xs font-semibold transition-colors">✏️ Editar</button>
                            <button type="button" onclick="deletarDespesa('${escapeHTML(item.id)}')" class="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs font-semibold transition-colors">🗑️ Excluir</button>
                        </td>
                    </tr>`;
                });

                tableBody.innerHTML = html || '<tr><td colspan="4" class="p-6 text-center text-gray-500 text-sm">Nenhuma despesa registrada.</td></tr>';
                document.getElementById('total-despesas-txt').innerText = formatarMoeda(total);
            } catch (err) {
                console.error("Erro ao carregar despesas:", err);
                tableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-400">Falha ao carregar despesas. Verifique a conexão.</td></tr>';
            }
        }

        window.salvarDespesa = async function(e) {
            e.preventDefault();
            const btnSalvar = document.getElementById('btn-salvar-despesa');
            const id = document.getElementById('d-id').value;
            
            const dados = {
                nome: document.getElementById('d-nome').value.trim(),
                categoria: document.getElementById('d-categoria').value,
                valor: parseFloat(document.getElementById('d-valor').value) || 0
            };

            if (!dados.nome) {
                mostrarToast('Informe o nome/descrição da despesa.', 'erro');
                return;
            }
            if (dados.valor <= 0) {
                mostrarToast('Informe um valor válido para a despesa.', 'erro');
                return;
            }

            try {
                btnSalvar.disabled = true;
                btnSalvar.innerText = "⏳ Salvando...";

                if (id) {
                    await updateDoc(doc(db, "despesas", id), dados);
                } else {
                    await addDoc(collection(db, "despesas"), dados);
                }
                
                window.closeModal('modal-despesa');
                mostrarToast('Despesa salva com sucesso.', 'sucesso');
                carregarDespesas();
            } catch (err) {
                console.error("Erro ao salvar despesa:", err);
                mostrarToast('Erro ao salvar despesa. Tente novamente.', 'erro');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.innerText = "Salvar Despesa";
            }
        }

        window.editarDespesa = function(id) {
            const item = cacheDespesas.find(d => d.id === id);
            if (!item) return;

            document.getElementById('d-id').value = item.id;
            document.getElementById('d-nome').value = item.nome || '';
            document.getElementById('d-categoria').value = item.categoria || 'Veículo / Combustível';
            document.getElementById('d-valor').value = item.valor || '';

            document.getElementById('modal-despesa-titulo').innerText = 'Editar Despesa';
            document.getElementById('modal-despesa').classList.remove('hidden');
        }

        window.deletarDespesa = async function(id) {
            if (confirm("Deseja realmente excluir esta despesa permanentemente?")) {
                try {
                    await deleteDoc(doc(db, "despesas", id));
                    mostrarToast('Despesa excluída.', 'sucesso');
                    carregarDespesas();
                } catch (err) {
                    console.error("Erro ao excluir despesa:", err);
                    mostrarToast('Erro ao excluir. Verifique suas permissões.', 'erro');
                }
            }
        }
