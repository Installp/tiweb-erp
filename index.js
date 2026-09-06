// index.js

import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { arredondaMoeda } from './utils.js';

// ----------------------------------------------------
// VARIÁVEIS GERAIS
// ----------------------------------------------------
let chartEvolucaoInstance = null;
let chartStatusInstance = null;

// ELEMENTOS DO DOM (Telas e Formulários)
const loginForm = document.getElementById('login-form');
const screenLoading = document.getElementById('screen-loading');
const screenLogin = document.getElementById('screen-login');
const appDashboard = document.getElementById('app-dashboard');

// ----------------------------------------------------
// 1. SISTEMA DE LOGIN
// ----------------------------------------------------
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const errorMsg = document.getElementById('login-error');
        
        errorMsg.classList.add('hidden');

        signInWithEmailAndPassword(auth, email, pass)
            .catch((error) => {
                console.error("Erro no login:", error);
                errorMsg.classList.remove('hidden');
            });
    });
}

// ----------------------------------------------------
// 2. SISTEMA DE LOGOUT (Com Delegação de Evento)
// ----------------------------------------------------
// Como o menu lateral é injetado via JavaScript (menu.js), o botão de logout 
// pode não existir no instante 0. Ouvimos os cliques no body para capturá-lo.
document.body.addEventListener('click', (e) => {
    const btnOut = e.target.closest('#btn-logout-global');
    if (btnOut) {
        signOut(auth).then(() => {
            window.location.href = 'index.html'; // Força recarregar a tela inicial
        });
    }
});

// ----------------------------------------------------
// 3. NAVEGAÇÃO DOS CARDS DE ATALHO (Data-link)
// ----------------------------------------------------
document.querySelectorAll('[data-link]').forEach(button => {
    button.addEventListener('click', (e) => {
        const pagina = e.currentTarget.getAttribute('data-link');
        const paginaAtual = window.location.pathname.split('/').pop().toLowerCase();
        const paginaAlvo = pagina.toLowerCase();

        // Se já estiver na página, apenas rola para o topo
        if (paginaAtual === paginaAlvo || (paginaAtual === '' && paginaAlvo === 'index.html')) {
            const mainContent = document.querySelector('main');
            if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        window.location.href = pagina;
    });
});

// ----------------------------------------------------
// 4. MONITORAR SESSÃO (AUTENTICAÇÃO)
// ----------------------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (screenLoading) screenLoading.classList.add('hidden');

    if (user) {
        if (screenLogin) screenLogin.classList.add('hidden');
        if (appDashboard) appDashboard.classList.remove('hidden');
        
        // Dispara o carregamento dos dados e geração dos gráficos
        await carregarMetricasDashboard();
    } else {
        if (screenLogin) screenLogin.classList.remove('hidden');
        if (appDashboard) appDashboard.classList.add('hidden');
    }
});

// ----------------------------------------------------
// 5. CARREGAR MÉTRICAS E EXTRAIR DADOS PARA OS GRÁFICOS
// ----------------------------------------------------
async function carregarMetricasDashboard() {
    try {
        // Busca coleções do Firebase simultaneamente para ser mais rápido
        const [snapOS, snapC, snapS] = await Promise.all([
            getDocs(collection(db, "orcamentos")),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "servicos"))
        ]);

        // Preenche os cards de totais
        const countOS = document.getElementById('dash-os-total');
        if (countOS) countOS.innerText = snapOS.size;
        
        const countCli = document.getElementById('dash-cli-total');
        if (countCli) countCli.innerText = snapC.size;
        
        const countSer = document.getElementById('dash-ser-total');
        if (countSer) countSer.innerText = snapS.size;

        // Prepara os dados para o gráfico de Status
        let statusCount = { 'Em aberto': 0, 'Em andamento': 0, 'Concluído': 0 };
        
        // Prepara os dados para o gráfico de Evolução (Linha)
        // Pré-preenche os últimos 6 meses com R$ 0,00 para criar a "linha" inicial
        let faturamentoMensal = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const ano = d.getFullYear();
            faturamentoMensal[`${mes}/${ano}`] = 0;
        }

        // Analisa cada Ordem de Serviço
        snapOS.forEach(doc => {
            const os = doc.data();
            
            // 1. Conta os status da OS
            if (os.status === 'Em aberto') statusCount['Em aberto']++;
            else if (os.status === 'Em andamento') statusCount['Em andamento']++;
            else if (os.status === 'Concluído') statusCount['Concluído']++;

            // 2. Agrupa faturamento por mês (MM/YYYY)
            if (os.data && os.total) {
                const partesData = os.data.split('/');
                if (partesData.length === 3) {
                    const mesAno = `${partesData[1]}/${partesData[2]}`; // "MM/YYYY"
                    
                    if (faturamentoMensal[mesAno] !== undefined) {
                        faturamentoMensal[mesAno] = arredondaMoeda(faturamentoMensal[mesAno] + Number(os.total));
                    } else {
                        // Se for uma OS de um mês muito antigo, adiciona no gráfico também
                        faturamentoMensal[mesAno] = arredondaMoeda(Number(os.total));
                    }
                }
            }
        });

        // Chama a função que desenha os gráficos passando os dados coletados
        renderizarGraficos(statusCount, faturamentoMensal);

    } catch (err) {
        console.error("Erro ao carregar métricas:", err);
    }
}

// ----------------------------------------------------
// 6. RENDERIZAR GRÁFICOS (Chart.js)
// ----------------------------------------------------
function renderizarGraficos(statusCount, faturamentoMensal) {
    
    // Destroi os gráficos anteriores se existirem (evita erro de sobreposição ao redimensionar)
    if (chartEvolucaoInstance) chartEvolucaoInstance.destroy();
    if (chartStatusInstance) chartStatusInstance.destroy();

    // -- GRÁFICO 1: STATUS DAS OS (Doughnut) --
    const ctxStatus = document.getElementById('chartStatus');
    if (ctxStatus) {
        chartStatusInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Em Aberto', 'Em Andamento', 'Concluído'],
                datasets: [{
                    data: [statusCount['Em aberto'], statusCount['Em andamento'], statusCount['Concluído']],
                    backgroundColor: ['#eab308', '#3b82f6', '#10b981'], // Amarelo, Azul, Verde
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8' } }
                },
                cutout: '70%' // Espessura da argola central
            }
        });
    }

    // -- GRÁFICO 2: EVOLUÇÃO DO FATURAMENTO (Line) --
    const ctxEvolucao = document.getElementById('chartEvolucao');
    if (ctxEvolucao) {
        // Ordena cronologicamente os meses no eixo X
        const mesesLabels = Object.keys(faturamentoMensal).sort((a, b) => {
            const [mA, aA] = a.split('/');
            const [mB, aB] = b.split('/');
            return new Date(aA, mA - 1) - new Date(aB, mB - 1);
        });
        
        // Mapeia os valores (R$) correspondentes a cada mês
        const valoresData = mesesLabels.map(mes => faturamentoMensal[mes]);

        chartEvolucaoInstance = new Chart(ctxEvolucao, {
            type: 'line',
            data: {
                labels: mesesLabels,
                datasets: [{
                    label: 'Faturamento Bruto',
                    data: valoresData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4, // Suaviza a curva da linha
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                // Formata o valor dentro do balãozinho (Tooltip) para R$
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#30363d' }, // Cor das linhas de fundo
                        ticks: { 
                            color: '#94a3b8',
                            callback: function(value) {
                                // Deixa o eixo Y com a sigla R$
                                return 'R$ ' + value;
                            }
                        }
                    },
                    x: {
                        grid: { display: false }, // Remove as linhas verticais para ficar mais "clean"
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }
}