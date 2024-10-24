const CACHE_NAME = 'Biggyassets-cache-v1.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/about-us.html',
  '/signup.html',
  '/signin.html',
  '/bonus.html',
  '/confirm.html', // Only keep one instance
  '/dashboard.html',
  '/earning-history.html',
  '/invest.html',
  '/java.js',
  '/expiring.html',
  '/faq.html',
  '/fund-user.html',
  '/get-account-details.html',
  '/user-withdrawal.html',
  '/profile.html',
  '/users.html',
  '/pending-deposit.html',
  '/pending-withdrawals.html',
  '/withdrawal-history.html',
  '/withdrawal-request.html',
  '/css/about-us.css',
  '/css/forms.css',
  '/css/admindash.css',
  '/css/dashboard.css',
  '/css/faq.css',
  '/css/index.css',
  '/css/invest.css',
  '/css/signup.css',
  '/images/biggy logo medium.png',
  '/images/biggy logo large.png',
  '/images/biggy logo small.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});