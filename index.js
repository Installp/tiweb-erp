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
document.body.addEventListener('click', (e) => {
    const btnOut = e.target.closest('#btn-logout-global');
    if (btnOut) {
        signOut(auth).then(() => {
            window.location.href = 'index.html'; 
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
        const [snapOS, snapC, snapS] = await Promise.all([
            getDocs(collection(db, "orcamentos")),
            getDocs(collection(db, "clientes")),
            getDocs(collection(db, "servicos"))
        ]);

        const countOS = document.getElementById('dash-os-total');
        if (countOS) countOS.innerText = snapOS.size;
        
        const countCli = document.getElementById('dash-cli-total');
        if (countCli) countCli.innerText = snapC.size;
        
        const countSer = document.getElementById('dash-ser-total');
        if (countSer) countSer.innerText = snapS.size;

        let statusCount = { 'Em aberto': 0, 'Em andamento': 0, 'Concluído': 0 };
        
        let faturamentoMensal = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const ano = d.getFullYear();
            faturamentoMensal[`${mes}/${ano}`] = 0;
        }

        snapOS.forEach(doc => {
            const os = doc.data();
            
            if (os.status === 'Em aberto') statusCount['Em aberto']++;
            else if (os.status === 'Em andamento') statusCount['Em andamento']++;
            else if (os.status === 'Concluído') statusCount['Concluído']++;

            if (os.data && os.total) {
                const partesData = os.data.split('/');
                if (partesData.length === 3) {
                    const mesAno = `${partesData[1]}/${partesData[2]}`; 
                    
                    if (faturamentoMensal[mesAno] !== undefined) {
                        faturamentoMensal[mesAno] = arredondaMoeda(faturamentoMensal[mesAno] + Number(os.total));
                    } else {
                        faturamentoMensal[mesAno] = arredondaMoeda(Number(os.total));
                    }
                }
            }
        });

        renderizarGraficos(statusCount, faturamentoMensal);

    } catch (err) {
        console.error("Erro ao carregar métricas:", err);
    }
}

// ----------------------------------------------------
// 6. RENDERIZAR GRÁFICOS (Chart.js Modernizado)
// ----------------------------------------------------
function renderizarGraficos(statusCount, faturamentoMensal) {
    
    if (chartEvolucaoInstance) chartEvolucaoInstance.destroy();
    if (chartStatusInstance) chartStatusInstance.destroy();

    // -- GRÁFICO 1: STATUS DAS OS (Doughnut) --
    const canvasStatus = document.getElementById('chartStatus');
    if (canvasStatus) {
        const ctxStatus = canvasStatus.getContext('2d');
        chartStatusInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Em Aberto', 'Em Andamento', 'Concluído'],
                datasets: [{
                    data: [statusCount['Em aberto'], statusCount['Em andamento'], statusCount['Concluído']],
                    backgroundColor: ['#0567e793', '#b2b211', '#10b981'], 
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%', // Deixa a argola mais fina e elegante
                plugins: {
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            color: '#94a3b8',
                            usePointStyle: true, // Substitui os quadrados por bolinhas na legenda
                            padding: 20
                        } 
                    }
                }
            }
        });
    }

    // -- GRÁFICO 2: EVOLUÇÃO DO FATURAMENTO (Line) --
    const canvasEvolucao = document.getElementById('chartEvolucao');
    if (canvasEvolucao) {
        const ctxEvolucao = canvasEvolucao.getContext('2d');
        
        // Criação do gradiente dinâmico sob a linha
        let gradientBlue = ctxEvolucao.createLinearGradient(0, 0, 0, 300);
        gradientBlue.addColorStop(0, 'rgba(59, 130, 246, 0.45)'); 
        gradientBlue.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

        const mesesLabels = Object.keys(faturamentoMensal).sort((a, b) => {
            const [mA, aA] = a.split('/');
            const [mB, aB] = b.split('/');
            return new Date(aA, mA - 1) - new Date(aB, mB - 1);
        });
        
        const valoresData = mesesLabels.map(mes => faturamentoMensal[mes]);

        chartEvolucaoInstance = new Chart(ctxEvolucao, {
            type: 'line',
            data: {
                labels: mesesLabels,
                datasets: [{
                    label: 'Faturamento Bruto',
                    data: valoresData,
                    borderColor: '#3b82f6',
                    backgroundColor: gradientBlue, // Aplica o gradiente
                    borderWidth: 3, // Linha um pouco mais grossa para destacar
                    fill: true,
                    tension: 0.4, // Mantém a suavização em onda
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(22, 27, 34, 0.95)', // Fundo do tooltip combinando com o tema
                        titleColor: '#e5e7eb',
                        bodyColor: '#e5e7eb',
                        borderColor: '#30363d',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
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
                        border: { display: false }, // Remove a linha dura do eixo Y
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.04)', // Grade muito mais suave e discreta
                            drawTicks: false
                        }, 
                        ticks: { 
                            color: '#94a3b8',
                            padding: 10,
                            callback: function(value) {
                                return 'R$ ' + value;
                            }
                        }
                    },
                    x: {
                        border: { display: false }, // Remove a linha dura do eixo X
                        grid: { display: false }, // Sem grades verticais
                        ticks: { 
                            color: '#94a3b8',
                            padding: 10
                        }
                    }
                }
            }
        });
    }
}