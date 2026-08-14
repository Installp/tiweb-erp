// clientes.js
import { auth, db } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let cacheClientes = [];

// ELEMENTOS DO DOM
const tableClientes = document.getElementById('table-clientes');
const searchInput = document.getElementById('search-cliente');
const modalCliente = document.getElementById('modal-cliente');
const modalTitulo = document.getElementById('modal-cliente-titulo');

// CAMPOS DO FORMULÁRIO
const fId = document.getElementById('c-id');
const fNome = document.getElementById('c-nome');
const fContato = document.getElementById('c-contato');
const fFone = document.getElementById('c-fone');
const fEmail = document.getElementById('c-email');
const fDoc = document.getElementById('c-doc');
const fEndereco = document.getElementById('c-endereco');

// 1. INICIALIZAÇÃO E EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();
    configurarEventos();
});

function configurarEventos() {
    // Navegação do Menu Lateral
    document.querySelectorAll('[data-link]').forEach(button => {
        button.addEventListener('click', (e) => {
            window.location.href = e.currentTarget.getAttribute('data-link');
        });
    });

    // Botão Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            signOut(auth).then(() => window.location.href = 'Index.html');
        });
    }

    // Botão Voltar
    document.getElementById('btn-back')?.addEventListener('click', () => window.history.back());

    // Botões do Modal
    document.getElementById('btn-novo-cliente')?.addEventListener('click', abrirModalNovoCliente);
    
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.addEventListener('click', () => modalCliente.classList.add('hidden'));
    });

    // Botão Salvar
    document.getElementById('btn-salvar-cliente')?.addEventListener('click', salvarCliente);

    // Campo de Busca
    searchInput?.addEventListener('input', filtrarTabelaClientes);

    // Delegação de Eventos para os botões dinâmicos da tabela (Editar / Excluir)
    tableClientes?.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

        if (btnEdit) editarCliente(btnEdit.dataset.id);
        if (btnDelete) deletarCliente(btnDelete.dataset.id);
    });
}

// 2. FUNÇÕES DO MODAL
function abrirModalNovoCliente() {
    fId.value = '';
    fNome.value = '';
    fContato.value = '';
    fFone.value = '';
    fEmail.value = '';
    fDoc.value = '';
    fEndereco.value = '';
    modalTitulo.innerText = 'Cadastrar Novo Cliente';
    modalCliente.classList.remove('hidden');
}

// 3. COMUNICAÇÃO COM O FIREBASE
async function carregarClientes() {
    try {
        const snap = await getDocs(collection(db, "clientes"));
        cacheClientes = [];
        snap.forEach(d => {
            cacheClientes.push({ id: d.id, ...d.data() });
        });
        renderTabelaClientes(cacheClientes);
    } catch (err) {
        console.error("Erro ao buscar clientes:", err);
    }
}

async function salvarCliente() {
    const id = fId.value;
    const dados = {
        nome: fNome.value.trim(),
        contato: fContato.value.trim(),
        fone: fFone.value.trim(),
        email: fEmail.value.trim(),
        docNum: fDoc.value.trim(),
        endereco: fEndereco.value.trim()
    };

    try {
        if (id) {
            await updateDoc(doc(db, "clientes", id), dados);
        } else {
            await addDoc(collection(db, "clientes"), dados);
        }
        modalCliente.classList.add('hidden');
        carregarClientes();
    } catch (err) {
        console.error("Erro ao salvar cliente:", err);
        alert("Ocorreu um erro ao salvar o cliente.");
    }
}

async function deletarCliente(id) {
    if (confirm("Tem certeza que deseja excluir este cliente?")) {
        try {
            await deleteDoc(doc(db, "clientes", id));
            carregarClientes();
        } catch (err) {
            console.error("Erro ao excluir cliente:", err);
        }
    }
}

// 4. LÓGICA DE INTERFACE (Tabela e Filtro)
function renderTabelaClientes(lista) {
    let html = '';
    if (lista.length === 0) {
        html = `<tr><td colspan="7" class="p-4 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>`;
    } else {
        lista.forEach(item => {
            // Note que aqui adicionamos classes (btn-edit, btn-delete) e o data-id
            html += `<tr class="border-b border-cardborder hover:bg-darkbg/50 transition-colors">
                <td class="p-3 font-semibold text-white">${item.nome || '-'}</td>
                <td class="p-3">${item.contato || '-'}</td>
                <td class="p-3">${item.email || '-'}</td>
                <td class="p-3">${item.fone || '-'}</td>
                <td class="p-3">${item.docNum || '-'}</td>
                <td class="p-3">${item.endereco || '-'}</td>
                <td class="p-3 flex justify-center gap-2">
                    <button class="btn-edit px-2.5 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 text-xs font-semibold" data-id="${item.id}">✏️ Editar</button>
                    <button class="btn-delete px-2.5 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs font-semibold" data-id="${item.id}">🗑️ Excluir</button>
                </td>
            </tr>`;
        });
    }
    tableClientes.innerHTML = html;
}

function filtrarTabelaClientes() {
    const query = searchInput.value.toLowerCase().trim();
    const filtrados = cacheClientes.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(query)) ||
        (c.contato && c.contato.toLowerCase().includes(query)) ||
        (c.docNum && c.docNum.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
    renderTabelaClientes(filtrados);
}

function editarCliente(id) {
    const cliente = cacheClientes.find(c => c.id === id);
    if (!cliente) return;

    fId.value = cliente.id;
    fNome.value = cliente.nome || '';
    fContato.value = cliente.contato || '';
    fFone.value = cliente.fone || '';
    fEmail.value = cliente.email || '';
    fDoc.value = cliente.docNum || '';
    fEndereco.value = cliente.endereco || '';

    modalTitulo.innerText = 'Editar Cliente';
    modalCliente.classList.remove('hidden');
}