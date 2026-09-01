// configuracao.js

        import { carregarMenuLateral } from './menu.js';
        
        // 1. CARREGA O MENU LATERAL INDEPENDENTE
        carregarMenuLateral();

        // 2. RENDERIZA OS ÍCONES NATIVOS DA TELA
        document.addEventListener('DOMContentLoaded', () => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // 3. FIREBASE
        import { auth, db } from './firebase-config.js';
        import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
        import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
        import { mostrarToast } from './utils.js';

        // CHECAR AUTENTICAÇÃO
        onAuthStateChanged(auth, async (user) => {
            const loadingScreen = document.getElementById('screen-loading');
            if (loadingScreen) loadingScreen.classList.add('hidden');

            if (user) {
                document.getElementById('app-dashboard').classList.remove('hidden');
                await carregarDadosEmpresa();
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

        // SALVAR DADOS DA EMPRESA
        window.salvarDadosEmpresa = async function(e) {
            e.preventDefault();
            
            const btn = document.getElementById('btn-salvar-empresa');
            const textoOriginal = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ Salvando...';
            }

            const dadosEmpresa = {
                nome: document.getElementById('emp-nome').value.trim(),
                cnpj: document.getElementById('emp-cnpj').value.trim(),
                telefones: document.getElementById('emp-telefones').value.trim(),
                email: document.getElementById('emp-email').value.trim(),
                endereco: document.getElementById('emp-endereco').value.trim(),
                atualizadoEm: new Date().toISOString()
            };

            try {
                localStorage.setItem('dados_empresa', JSON.stringify(dadosEmpresa));
                const docRef = doc(db, "configuracoes", "empresa");
                await setDoc(docRef, dadosEmpresa, { merge: true });

                mostrarToast("Informações da empresa salvas com sucesso!", 'sucesso');
            } catch (err) {
                console.error("Erro ao salvar dados:", err);
                mostrarToast("Dados salvos localmente, mas ocorreu um erro ao salvar na nuvem: " + err.message, 'erro');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = textoOriginal;
                }
            }
        }

        // CARREGAR DADOS DA EMPRESA
        async function carregarDadosEmpresa() {
            const localData = localStorage.getItem('dados_empresa');
            if (localData) {
                try {
                    const dados = JSON.parse(localData);
                    preencherCamposEmpresa(dados);
                } catch (e) {}
            }

            try {
                const docRef = doc(db, "configuracoes", "empresa");
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const dados = snap.data();
                    preencherCamposEmpresa(dados);
                    localStorage.setItem('dados_empresa', JSON.stringify(dados));
                }
            } catch (err) {
                console.warn("Erro ao buscar dados da empresa:", err);
            }
        }

        function preencherCamposEmpresa(dados) {
            if (dados.nome) document.getElementById('emp-nome').value = dados.nome;
            if (dados.cnpj) document.getElementById('emp-cnpj').value = dados.cnpj;
            if (dados.telefones) document.getElementById('emp-telefones').value = dados.telefones;
            if (dados.email) document.getElementById('emp-email').value = dados.email;
            if (dados.endereco) document.getElementById('emp-endereco').value = dados.endereco;
        }

        // FUNÇÃO DE ATUALIZAÇÃO (SISTEMA DE VERSION.JSON)
        const VERSAO_ATUAL = "1.3.0";

        window.verificarAtualizacao = async function(event) {
            const btn = event?.currentTarget;
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = "🔄 Verificando...";
            }

            try {
                const resposta = await fetch(`version.json?v=${Date.now()}`);
                if (!resposta.ok) throw new Error("Falha na busca.");

                const dados = await resposta.json();

                if (dados.versao !== VERSAO_ATUAL) {
                    let listaNovidades = dados.novidades.map(item => `• ${item}`).join('\n');
                    let mensagem = `🚀 Nova Versão: v${dados.versao} (${dados.data})\n\nNovidades:\n${listaNovidades}\n\nDeseja atualizar agora?`;

                    if (confirm(mensagem)) {
                        if ('caches' in window) {
                            const cacheNames = await caches.keys();
                            await Promise.all(cacheNames.map(name => caches.delete(name)));
                        }
                        window.location.reload(true);
                    }
                } else {
                    mostrarToast(`✅ Você já está utilizando a versão mais recente (${VERSAO_ATUAL})!`, 'sucesso');
                }
            } catch (erro) {
                console.error("Erro verificação:", erro);
                mostrarToast("⚠️ Não foi possível verificar atualizações. Verifique sua conexão.", 'erro');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> Verificar Novas Atualizações`;
                    lucide.createIcons();
                }
            }
        }

        // OUTRAS FUNÇÕES DE MANUTENÇÃO
        window.limparCacheLocal = function() {
            if (confirm("Deseja redefinir os temas e configurações locais salvas no navegador?")) {
                localStorage.clear();
                alert("Preferências locais removidas. A página será recarregada.");
                window.location.reload();
            }
        }

        window.confirmarResetSistema = function() {
            if (confirm("ATENÇÃO: Deseja realmente resetar a sessão do sistema? Você precisará realizar login novamente.")) {
                signOut(auth).then(() => {
                    window.location.href = 'index.html';
                });
            }
        }
