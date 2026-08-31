// despesas.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { carregarMenuLateral } from './menu.js';

// 1. Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBHMJCMzX-5so4gAD8aXv0SOpps-2xxeLE",
    authDomain: "erp-ti-2c92d.firebaseapp.com",
    projectId: "erp-ti-2c92d",
    storageBucket: "erp-ti-2c92d.firebasestorage.app",
    messagingSenderId: "1075643576721",
    appId: "1:1075643576721:web:5a9da33c743494275eea30"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let cacheDespesas = [];

// 2. Inicialização da Tela (Menu e Ícones)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    carregarMenuLateral();
});

// 3. Checagem de Autenticação e Carregamento
onAuthStateChanged(auth, (user) => {
    const loadingScreen = document.getElementById('screen-loading');
    if (loadingScreen) loadingScreen.classList.add('hidden');

    if (user) {
        document.getElementById('app-dashboard').classList.remove('hidden');
        carregarDespesas(); // Carrega os dados somente se logado
    } else {
        window.location.href = 'Index.html'; // Redireciona se não houver usuário
    }
});

// 4. Lógica de Logout Global (Ativada pelo menu dinâmico)
document.body.addEventListener('click', (e) => {
    const btnOut = e.target.closest('#btn-logout-global');
    if (btnOut) {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        });
    }
});

// 5. Funções Utilitárias e Navegação
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

const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
};

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
            total += Number(item.valor) || 0;

            html += `<tr class="border-b border-cardborder hover:bg-darkbg/50 transition-colors">
                <td class="p-3 font-semibold text-white">${item.nome || '-'}</td>
                <td class="p-3"><span class="px-2.5 py-1 bg-gray-700/50 border border-gray-600/50 text-gray-300 rounded-full text-xs font-medium">${item.categoria || 'Geral'}</span></td>
                <td class="p-3 font-semibold text-red-400">${formatarMoeda(item.valor)}</td>
                <td class="p-3 flex justify-center gap-2">
                    <button type="button" onclick="editarDespesa('${item.id}')" class="px-2.5 py-1.5 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 text-xs font-semibold transition-colors">✏️ Editar</button>
                    <button type="button" onclick="deletarDespesa('${item.id}')" class="px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs font-semibold transition-colors">🗑️ Excluir</button>
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

    try {
        btnSalvar.disabled = true;
        btnSalvar.innerText = "⏳ Salvando...";

        if (id) {
            await updateDoc(doc(db, "despesas", id), dados);
        } else {
            await addDoc(collection(db, "despesas"), dados);
        }
        
        window.closeModal('modal-despesa');
        carregarDespesas();
    } catch (err) {
        console.error("Erro ao salvar despesa:", err);
        alert("Erro ao salvar despesa. Tente novamente.");
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
            carregarDespesas();
        } catch (err) {
            console.error("Erro ao excluir despesa:", err);
            alert("Erro ao excluir. Verifique suas permissões.");
        }
    }
}