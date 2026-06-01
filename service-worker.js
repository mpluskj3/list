const CACHE_NAME = 'sheet-viewer-v11';

// 캐시할 정적 자산 (이미지/아이콘 등 거의 변하지 않는 것만)
const STATIC_ASSETS = [
    './icon.svg',
    './icon-192.png',
    './icon-512.png',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 네트워크 우선 처리할 파일 확장자
const NETWORK_FIRST_EXTENSIONS = ['.js', '.css', '.html'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then((cacheNames) =>
                Promise.all(
                    cacheNames.map((name) => {
                        if (name !== CACHE_NAME) return caches.delete(name);
                    })
                )
            )
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const isNetworkFirst = NETWORK_FIRST_EXTENSIONS.some(ext => url.pathname.endsWith(ext));

    if (isNetworkFirst) {
        // 네트워크 우선: HTTP 캐시까지 무시하고 항상 서버에서 최신 파일을 가져옴
        event.respondWith(
            fetch(new Request(event.request, { cache: 'reload' }))
                .then((response) => {
                    if (response && response.status === 200 && response.type === 'basic') {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request)) // 오프라인 시 캐시 폴백
        );
    } else {
        // 캐시 우선: 이미지, 폰트 등
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return cached || fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
                    }
                    return response;
                });
            })
        );
    }
});