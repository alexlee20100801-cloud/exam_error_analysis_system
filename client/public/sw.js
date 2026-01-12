// Service Worker for PWA offline support and push notifications
// Version: 3.0.0 - Enhanced with push notifications for review reminders
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `exam-error-analysis-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `exam-error-analysis-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `exam-error-analysis-images-${CACHE_VERSION}`;
const API_CACHE = `exam-error-analysis-api-${CACHE_VERSION}`;

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
];

// 需要缓存的API路径模式
const CACHEABLE_API_PATTERNS = [
  /\/api\/trpc\/errorQuestions\.list/,
  /\/api\/trpc\/errorQuestions\.getById/,
  /\/api\/trpc\/knowledgeGraph\.getTree/,
  /\/api\/trpc\/stats\.getByLevel/,
  /\/api\/trpc\/userSettings\.getSettings/,
];

// 图片URL模式
const IMAGE_URL_PATTERNS = [
  /\.(?:png|jpg|jpeg|gif|webp|svg)$/i,
  /\/storage\//,
  /s3\.amazonaws\.com/,
  /cloudfront\.net/,
];

// 检查URL是否为可缓存的API
function isCacheableApi(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url));
}

// 检查URL是否为图片
function isImageUrl(url) {
  return IMAGE_URL_PATTERNS.some(pattern => pattern.test(url));
}

// 安装事件 - 预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // 强制激活新的Service Worker
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 删除旧版本的缓存
          if (
            cacheName.startsWith('exam-error-analysis-') &&
            !cacheName.endsWith(CACHE_VERSION)
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 立即控制所有客户端
  return self.clients.claim();
});

// Fetch事件 - 智能缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非GET请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过chrome扩展和开发工具请求
  if (url.protocol === 'chrome-extension:' || url.protocol === 'devtools:') {
    return;
  }

  // 跳过WebSocket请求
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // 图片资源：缓存优先策略
  if (isImageUrl(url.href)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // 可缓存的API请求：网络优先，失败时使用缓存
  if (isCacheableApi(url.href)) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 其他API请求：仅网络
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // 静态资源：缓存优先，网络回退
  event.respondWith(handleStaticRequest(request));
});

// 处理图片请求 - 缓存优先策略
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // 后台更新缓存
    fetchAndCache(request, IMAGE_CACHE);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 返回占位图片
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect fill="#f0f0f0" width="200" height="200"/>
        <text fill="#999" font-family="sans-serif" font-size="14" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">
          离线图片
        </text>
      </svg>`,
      {
        headers: { 'Content-Type': 'image/svg+xml' },
      }
    );
  }
}

// 处理API请求 - 网络优先策略
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      // 缓存成功的响应
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 网络失败时尝试从缓存获取
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving cached API response:', request.url);
      return cachedResponse;
    }

    // 返回离线错误响应
    return new Response(
      JSON.stringify({
        error: 'OFFLINE',
        message: '当前处于离线状态，无法获取最新数据',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// 处理静态资源请求 - 缓存优先策略
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 对于导航请求，返回离线页面
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('Offline', { status: 503 });
  }
}

// 后台更新缓存
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // 静默失败
  }
}

// 消息事件 - 支持手动操作
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
      );
      break;

    case 'CLEAR_API_CACHE':
      event.waitUntil(caches.delete(API_CACHE));
      break;

    case 'CLEAR_IMAGE_CACHE':
      event.waitUntil(caches.delete(IMAGE_CACHE));
      break;

    case 'CACHE_ERROR_QUESTIONS':
      // 预缓存错题数据
      if (payload && payload.urls) {
        event.waitUntil(
          caches.open(API_CACHE).then((cache) => {
            return Promise.all(
              payload.urls.map((url) =>
                fetch(url).then((response) => {
                  if (response.ok) {
                    return cache.put(url, response);
                  }
                })
              )
            );
          })
        );
      }
      break;

    case 'GET_CACHE_STATUS':
      // 获取缓存状态
      event.waitUntil(
        Promise.all([
          caches.open(STATIC_CACHE).then((cache) => cache.keys()),
          caches.open(RUNTIME_CACHE).then((cache) => cache.keys()),
          caches.open(IMAGE_CACHE).then((cache) => cache.keys()),
          caches.open(API_CACHE).then((cache) => cache.keys()),
        ]).then(([staticKeys, runtimeKeys, imageKeys, apiKeys]) => {
          event.source.postMessage({
            type: 'CACHE_STATUS',
            payload: {
              static: staticKeys.length,
              runtime: runtimeKeys.length,
              images: imageKeys.length,
              api: apiKeys.length,
            },
          });
        })
      );
      break;
      
    case 'SHOW_NOTIFICATION':
      // 从客户端触发显示通知
      if (payload) {
        event.waitUntil(
          self.registration.showNotification(payload.title || '学习提醒', {
            body: payload.body || '您有新的学习任务',
            icon: payload.icon || '/icon-192x192.png',
            badge: payload.badge || '/icon-72x72.png',
            tag: payload.tag || 'default',
            data: payload.data || {},
            vibrate: payload.vibrate || [100, 50, 100],
            requireInteraction: payload.requireInteraction || false,
            actions: payload.actions || [],
          })
        );
      }
      break;
  }
});

// 后台同步事件
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-error-questions') {
    event.waitUntil(syncErrorQuestions());
  }
  
  if (event.tag === 'check-review-reminders') {
    event.waitUntil(checkReviewReminders());
  }
});

// 同步错题数据
async function syncErrorQuestions() {
  console.log('[SW] Syncing error questions...');
}

// 检查复习提醒
async function checkReviewReminders() {
  console.log('[SW] Checking review reminders...');
  // 这里可以实现后台检查复习提醒的逻辑
}

// 推送通知事件 - 支持服务器推送
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event received but no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: '学习提醒',
      body: event.data.text() || '您有新的学习任务',
    };
  }

  // 获取用户语言偏好
  const lang = data.lang || 'zh-CN';
  
  // 多语言通知文本
  const messages = {
    'zh-CN': {
      defaultTitle: '学习提醒',
      defaultBody: '您有新的学习任务',
      reviewTitle: '复习提醒',
      reviewBody: `您有 ${data.count || 0} 道错题需要复习`,
      practiceTitle: '练习提醒',
      practiceBody: '今天还没有完成练习目标哦',
      achievementTitle: '成就解锁',
      achievementBody: `恭喜获得新徽章：${data.badge || ''}`,
      viewAction: '查看',
      closeAction: '稍后',
    },
    'en': {
      defaultTitle: 'Study Reminder',
      defaultBody: 'You have new study tasks',
      reviewTitle: 'Review Reminder',
      reviewBody: `You have ${data.count || 0} error questions to review`,
      practiceTitle: 'Practice Reminder',
      practiceBody: "You haven't completed today's practice goal yet",
      achievementTitle: 'Achievement Unlocked',
      achievementBody: `Congratulations! You earned a new badge: ${data.badge || ''}`,
      viewAction: 'View',
      closeAction: 'Later',
    },
  };

  const msg = messages[lang] || messages['zh-CN'];

  // 根据通知类型设置内容
  let title = data.title || msg.defaultTitle;
  let body = data.body || msg.defaultBody;
  let url = data.url || '/';

  if (data.type === 'review') {
    title = msg.reviewTitle;
    body = msg.reviewBody;
    url = '/review';
  } else if (data.type === 'practice') {
    title = msg.practiceTitle;
    body = msg.practiceBody;
    url = '/practice';
  } else if (data.type === 'achievement') {
    title = msg.achievementTitle;
    body = msg.achievementBody;
    url = '/profile';
  }

  const options = {
    body: body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-72x72.png',
    vibrate: data.vibrate || [200, 100, 200],
    tag: data.tag || data.type || 'default',
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    data: {
      url: url,
      type: data.type,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: msg.viewAction },
      { action: 'close', title: msg.closeAction },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    console.log('[SW] Notification dismissed by user');
    return;
  }

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 查找已打开的窗口
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // 导航到目标URL
          client.navigate(url);
          return client.focus();
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// 通知关闭事件
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// 定期后台同步（如果浏览器支持）
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reviews') {
    event.waitUntil(checkAndNotifyReviews());
  }
});

// 检查并发送复习提醒
async function checkAndNotifyReviews() {
  try {
    // 尝试从API获取待复习数量
    const response = await fetch('/api/trpc/reviewPlan.getDueReviewsCount');
    if (response.ok) {
      const data = await response.json();
      const count = data?.result?.data || 0;
      
      if (count > 0) {
        const lang = 'zh-CN'; // 可以从存储中获取
        const msg = lang === 'en' 
          ? { title: 'Review Reminder', body: `You have ${count} error questions to review` }
          : { title: '复习提醒', body: `您有 ${count} 道错题需要复习` };
        
        await self.registration.showNotification(msg.title, {
          body: msg.body,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          tag: 'review-reminder',
          data: { url: '/review', type: 'review' },
          vibrate: [200, 100, 200],
          requireInteraction: true,
        });
      }
    }
  } catch (error) {
    console.error('[SW] Error checking reviews:', error);
  }
}

console.log('[SW] Service Worker loaded - Version:', CACHE_VERSION);
