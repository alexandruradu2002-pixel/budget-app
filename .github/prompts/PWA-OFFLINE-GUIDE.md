# PWA Offline & Black Screen Fix

Ghid pentru PWA fără black screen pe iOS/Android.

## Problema

Black screen la cold start cauzat de:
1. Service Worker returnează HTML cached corupt
2. Background color aplicat prea târziu
3. Loading indicator blocat
4. PWA suspend în background

## Soluția

## Soluția

### 1. Service Worker - NU cache HTML!

```javascript
// sw.js
const CACHE_NAME = 'app-v1';
const API_CACHE = 'api-v1';

// Cache doar offline.html, NU pagini normale
const STATIC = ['/offline.html', '/manifest.json', '/favicon.png'];

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // CRITICAL: Nu intercepta navigarea!
  if (e.request.mode === 'navigate') return;
  
  // Cache assets (JS, CSS, imagini)
  if (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2)$/)) {
    e.respondWith(
      caches.match(e.request).then(cached => 
        cached || fetch(e.request).then(r => {
          caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone()));
          return r;
        })
      )
    );
    return;
  }
  
  // Cache API cu stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      caches.open(API_CACHE).then(cache => 
        cache.match(e.request).then(cached => {
          const fetched = fetch(e.request).then(r => {
            if (r.ok) cache.put(e.request, r.clone());
            return r;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
  }
});
```

### 2. app.html - Background instant

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0F172A" />
    
    <style>
      html, body { background: #0F172A; margin: 0; min-height: 100vh; }
      #app-loading {
        position: fixed; inset: 0; background: #0F172A;
        display: flex; align-items: center; justify-content: center; z-index: 9999;
      }
      #app-loading.hide { display: none; }
      .spinner {
        width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1);
        border-top-color: #3B82F6; border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    
    <script>
      // Aplică tema INSTANT
      try {
        var t = localStorage.getItem('app-theme');
        var bg = { dark: '#0F172A', light: '#F8FAFC' }[t];
        if (bg) {
          document.documentElement.style.background = bg;
          document.body.style.background = bg;
        }
        if (t) document.documentElement.classList.add('theme-' + t);
      } catch(e) {}
    </script>
    
    %sveltekit.head%
  </head>
  
  <body>
    <div id="app-loading"><div class="spinner"></div></div>
    <div style="display: contents">%sveltekit.body%</div>
    
    <script>
      function hide() {
        var l = document.getElementById('app-loading');
        if (l) l.classList.add('hide');
      }
      window.addEventListener('load', hide);
      window.addEventListener('sveltekit:start', hide);
      setTimeout(hide, 10000); // 10s fallback
    </script>
  </body>
</html>
```

### 3. Layout Component

```typescript
// +layout.svelte (SvelteKit)
import { onMount } from 'svelte';
import { themeStore } from '$lib/stores';

onMount(() => {
  document.getElementById('app-loading')?.classList.add('hide');
  themeStore.init();
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => reg.update())
      .catch(console.error);
  }
});
```

### 4. Manifest & Offline Page

**manifest.json:**
```json
{
  "name": "App", "short_name": "App", "start_url": "/",
  "display": "standalone", "background_color": "#0F172A",
  "theme_color": "#3B82F6", "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**offline.html:**
```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Offline</title>
<style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;
margin:0;background:#0F172A;color:#F8FAFC;text-align:center;padding:20px;font-family:system-ui}
button{background:#3B82F6;color:#fff;border:0;padding:12px 24px;border-radius:8px;
cursor:pointer;margin-top:20px}</style></head><body><div><h1>Offline</h1>
<p>No internet connection.</p><button onclick="location.reload()">Try Again</button>
</div></body></html>
```

## Anti-Patterns

### ❌ NU:
- Cache HTML în SW: `const CACHE_ALL = ['/', '/dashboard']`
- `document.write('<style>...')`
- Aplică tema după onMount (prea târziu!)
- Un singur event: `addEventListener('load', hide)` 
- SW interceptează navigarea: `if (mode === 'navigate') event.respondWith(...)`

### ✅ DA:
- Cache doar assets: `['/offline.html', '/manifest.json']`
- Style inline în `<head>`: `<style>html,body{background:#0F172A}</style>`
- Tema aplicată sincron în `<script>` înainte de body
- Multiple fallbacks: `load + sveltekit:start + timeout`
- Lasă navigarea la browser: `if (mode === 'navigate') return`

## Testing

**Desktop:** Fresh load, hard refresh, theme switch, SW install
**iOS:** Add to Home, cold start, resume, offline mode
**Android:** Install PWA, cold start, app switch, offline mode

**Debug:**
```javascript
// Chrome DevTools / Remote Debug
navigator.serviceWorker.getRegistration().then(r => console.log(r.active.state));
caches.keys().then(k => console.log('Caches:', k));
```

## Fix Rapid

**Black screen?**
- [ ] SW cache-ază HTML? → Scoate din cache
- [ ] Background lipsește? → Adaugă în `<style>` din `<head>`
- [ ] Loader blocat? → Verifică timeout fallback
- [ ] Event nu se declanșează? → Adaugă mai multe fallbacks

## Concluzie

Cele 3 reguli de aur:
1. **NU cache HTML în Service Worker**
2. **Background aplicat INSTANT în `<style>`**
3. **Multiple fallbacks pentru loading**

Pattern testat iOS 15-18, Android 10-14. Zero black screens.
