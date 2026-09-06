// sw.js - Service Worker do TiWeb ERP
//
// Estratégia: "network-first" para tudo. O sistema trabalha com dados
// ao vivo do Firestore, então NUNCA queremos mostrar uma tela ou dado
// desatualizado quando há internet disponível.
//
// O cache serve só como fallback: se a rede cair no meio do uso (ex:
// sinal fraco visitando um cliente), o app ainda abre com a última
// versão salva das telas (HTML/CSS/JS/ícones) em vez de dar erro em
// branco. Os DADOS (clientes, OS, financeiro) continuam exigindo
// internet, pois vêm do Firestore, não deste cache.

const CACHE_NAME = 'tiweb-erp-v1';

const ARQUIVOS_ESSENCIAIS = [
    '/',
    '/index.html',
    '/clientes.html',
    '/despesas.html',
    '/servicos.html',
    '/financeiro.html',
    '/ordemdeServico.html',
    '/relatorios.html',
    '/configuracao.html',
    '/style.css',
    '/tailwind-theme.js',
    '/theme-loader.js',
    '/menu.js',
    '/utils.js',
    '/firebase-config.js',
    '/index.js',
    '/clientes.js',
    '/despesas.js',
    '/servicos.js',
    '/financeiro.js',
    '/ordemdeServico.js',
    '/relatorios.js',
    '/configuracao.js',
    '/logo.png',
    '/icon-192.png',
    '/icon-512.png',
    '/manifest.json'
];

// Instala o Service Worker e guarda o "esqueleto" do app em cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ARQUIVOS_ESSENCIAIS);
        })
    );
    self.skipWaiting();
});

// Remove caches de versões antigas quando uma nova versão é publicada
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((nomes) => {
            return Promise.all(
                nomes
                    .filter((nome) => nome !== CACHE_NAME)
                    .map((nome) => caches.delete(nome))
            );
        })
    );
    self.clients.claim();
});

// Estratégia network-first com fallback para cache
self.addEventListener('fetch', (event) => {
    // Nunca interfere em chamadas para o Firebase/Firestore/Auth —
    // esses dados precisam sempre vir da rede, nunca do cache.
    if (event.request.url.includes('firestore.googleapis.com') ||
        event.request.url.includes('googleapis.com') ||
        event.request.url.includes('identitytoolkit')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((resposta) => {
                // Atualiza o cache com a versão mais recente sempre que
                // a rede responder com sucesso.
                const respostaClone = resposta.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, respostaClone);
                });
                return resposta;
            })
            .catch(() => {
                // Sem internet: tenta servir do cache
                return caches.match(event.request);
            })
    );
});
