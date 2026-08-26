// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);

// Exporta para ser usado em outras páginas
export { auth, db };