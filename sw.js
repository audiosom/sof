// SOF — guarda uma cópia da TELA no aparelho, para o sistema abrir mesmo se o GitHub
// estiver fora do ar. A tela é sempre buscada na internet primeiro (assim as atualizações
// chegam logo); a cópia guardada só é usada quando a internet ou o GitHub falham.
// Os DADOS nunca passam por aqui: as conversas com o servidor do Google não são guardadas.
const CACHE = 'sof-tela-v1';
const ARQUIVOS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icone-192.png', './icone-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  if (new URL(pedido.url).origin !== self.location.origin) return; // Google e fontes: direto pela internet

  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta && resposta.ok && resposta.type === 'basic' && !resposta.redirected) {
          const copia = resposta.clone();
          caches.open(CACHE).then((c) => c.put(pedido, copia));
        }
        if (resposta && resposta.redirected) {
          // o navegador recusa resposta "redirecionada" para abrir uma página: entrega uma cópia limpa
          return new Response(resposta.body, { status: resposta.status, statusText: resposta.statusText, headers: resposta.headers });
        }
        return resposta;
      })
      .catch(() =>
        caches.match(pedido, { ignoreSearch: true })
          .then((guardada) => guardada || (pedido.mode === 'navigate' ? caches.match('./index.html') : undefined))
          .then((guardada) => guardada || Response.error())
      )
  );
});
