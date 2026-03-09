/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Handle Web Share Target POST requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const imageFile = formData.get('image') as File | null;

        if (imageFile) {
          event.waitUntil(
            (async () => {
              // Wait for a client window
              await new Promise((r) => setTimeout(r, 1000));
              const allClients = await self.clients.matchAll({ type: 'window' });
              for (const client of allClients) {
                client.postMessage({ type: 'SHARED_IMAGE', file: imageFile });
              }
            })()
          );
        }

        return Response.redirect('/', 303);
      })()
    );
  }
});
