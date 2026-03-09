/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// SPA fallback: serve index.html for all navigation requests
const handler = createHandlerBoundToURL('/foodlog/index.html');
const navigationRoute = new NavigationRoute(handler);
registerRoute(navigationRoute);

// Handle Web Share Target POST requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/foodlog/share' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const imageFile = formData.get('image') as File | null;

        if (imageFile) {
          event.waitUntil(
            (async () => {
              await new Promise((r) => setTimeout(r, 1000));
              const allClients = await self.clients.matchAll({ type: 'window' });
              for (const client of allClients) {
                client.postMessage({ type: 'SHARED_IMAGE', file: imageFile });
              }
            })()
          );
        }

        return Response.redirect('/foodlog/', 303);
      })()
    );
  }
});
