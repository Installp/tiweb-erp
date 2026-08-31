// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBHMJCMzX-5so4gAD8aXv0SOpps-2xxeLE",
    authDomain: "erp-ti-2c92d.firebaseapp.com",
    projectId: "erp-ti-2c92d",
    storageBucket: "erp-ti-2c92d.firebasestorage.app",
    messagingSenderId: "1075643576721",
    appId: "1:1075643576721:web:5a9da33c743494275eea30"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sessão dura apenas enquanto a aba/janela do navegador estiver aberta.
// Fechou o navegador (mesmo sem clicar em Sair), o login expira e é
// necessário autenticar novamente na próxima abertura.
setPersistence(auth, browserSessionPersistence).catch((err) => {
    console.error("Erro ao configurar persistência de sessão:", err);
});

// Inicializa o Firestore com Cache Local Persistente (Carregamento instantâneo)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// Exporta para ser usado em outras páginas
export { auth, db };