// Service Worker for Mobile Delivery Note App

const CACHE_NAME = 'delivery-note-app-v1';

// Dynamically determine the base path for assets
const getBasePath = () => {
  // Extract the path from the service worker scope
  const scope = self.registration.scope;
  // Check if we're on GitHub Pages (contains github.io)
  const isGitHubPages = scope.includes('github.io');
  
  if (isGitHubPages) {
    // Extract the repository name from the pathname
    const pathSegments = new URL(scope).pathname.split('/');
    // The first segment after the domain will be the repository name
    const repoName = pathSegments[1];
    
    if (repoName) {
      return `/${repoName}/`; // Return path with repo name
    }
  }
  
  return './'; // Default to relative path for local development
};

// Function to get the full asset path
const getAssetPath = (asset) => {
  // If it's already an absolute URL (starts with http or https), return as is
  if (asset.startsWith('http')) {
    return asset;
  }
  
  // Otherwise, prepend the base path
  const basePath = getBasePath();
  // Remove leading ./ from asset if present
  const cleanAsset = asset.startsWith('./') ? asset.substring(2) : asset;
  return `${basePath}${cleanAsset}`;
};

// Assets to cache
const ASSETS_TO_CACHE = [
  'Mobile Delivery Note App.html',
  'mobile-delivery-note-styles.css',
  'mobile-delivery-note.js',
  'reproplast-logo.svg',
  'app-icon.png',
  'app-icon-512.png',
  'base.js',
  '404.html',
  'manifest.json',
  'https://unpkg.com/html5-qrcode',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/uuid@8.3.2/dist/umd/uuid.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell and content');
        // Map each asset to its full path before caching
        const assetsWithPaths = ASSETS_TO_CACHE.map(asset => getAssetPath(asset));
        return cache.addAll(assetsWithPaths);
      })
      .catch(error => {
        console.error('[Service Worker] Cache addAll failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Claim clients to ensure the SW is in control immediately
  event.waitUntil(self.clients.claim());
  
  // Remove old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.startsWith('https://unpkg.com') && 
      !event.request.url.startsWith('https://cdnjs.cloudflare.com') && 
      !event.request.url.startsWith('https://cdn.jsdelivr.net')) {
    return;
  }
  
  // For HTML requests, use network-first strategy
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the latest version
          let responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Cache the response for future
            let responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
            return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // For image requests, return a fallback image
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match(getAssetPath('app-icon.png'));
            }
            // Otherwise just propagate the error
            throw error;
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});