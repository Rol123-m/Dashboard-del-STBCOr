(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  let deferredInstall = null;
  let registration = null;
  let reloadAfterUpdate = false;

  const message = text => {
    const host = $('#toasts');
    if (!host) return window.alert(text);
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = text;
    host.append(item);
    window.setTimeout(() => item.remove(), 5200);
  };

  function installed() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function addControls() {
    const login = $('.lform');
    if (login && !$('.pwa-login-install', login)) {
      const loginButton = document.createElement('button');
      loginButton.className = 'pwa-login-install';
      loginButton.type = 'button';
      loginButton.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i> Instalar aplicación';
      loginButton.addEventListener('click', installApp);
      login.append(loginButton);
      if (installed()) loginButton.hidden = true;
    }
    const bar = $('.bar');
    if (!bar || $('.pwa-actions', bar)) return;
    const group = document.createElement('div');
    group.className = 'pwa-actions';
    group.innerHTML = `
      <button class="pwa-btn pwa-install" type="button" aria-label="Instalar aplicación" title="Instalar aplicación">
        <i class="fas fa-download" aria-hidden="true"></i><span class="pwa-label">Instalar</span>
      </button>
      <button class="pwa-btn pwa-update" type="button" aria-label="Actualizar aplicación" title="Hay una versión nueva disponible" hidden>
        <i class="fas fa-rotate" aria-hidden="true"></i><span class="pwa-label">Actualizar</span>
      </button>
      <button class="pwa-btn pwa-notify" type="button" aria-label="Activar notificaciones" title="Notificaciones">
        <i class="fas fa-bell" aria-hidden="true"></i><span class="pwa-label">Avisos</span>
      </button>`;
    const profile = $('#me', bar);
    bar.insertBefore(group, profile || null);

    $('.pwa-install', group).addEventListener('click', installApp);
    $('.pwa-update', group).addEventListener('click', updateApp);
    $('.pwa-notify', group).addEventListener('click', enableNotifications);
    if (installed()) $('.pwa-install', group).hidden = true;
    if (registration && registration.waiting) showUpdate();
  }

  function showUpdate() {
    const button = $('.pwa-update');
    if (button) button.hidden = false;
  }

  async function installApp() {
    if (installed()) return message('La aplicación ya está instalada.');
    if (!deferredInstall) {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      return message(ios
        ? 'Para instalarla en iPhone/iPad: pulsa Compartir y selecciona «Añadir a pantalla de inicio».'
        : 'Si tu navegador ofrece «Instalar aplicación» o «Añadir a pantalla de inicio», selecciónalo desde el menú del navegador. La instalación requiere HTTPS.');
    }
    deferredInstall.prompt();
    const choice = await deferredInstall.userChoice;
    deferredInstall = null;
    if (choice && choice.outcome === 'accepted') message('Solicitud de instalación aceptada.');
  }

  async function updateApp() {
    if (!registration || !registration.waiting) {
      if (registration) await registration.update();
      if (!registration || !registration.waiting) return message('La aplicación ya está actualizada.');
    }
    reloadAfterUpdate = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return message('Este navegador no admite notificaciones web.');
    }
    if (!window.isSecureContext) return message('Las notificaciones requieren una conexión HTTPS.');
    let permission = Notification.permission;
    if (permission === 'default') permission = await Notification.requestPermission();
    if (permission !== 'granted') return message('No se concedió permiso para mostrar notificaciones.');
    try {
      const reg = registration || await navigator.serviceWorker.ready;
      await reg.showNotification('STBCOr · Notificaciones activadas', {
        body: 'Este dispositivo permite mostrar notificaciones. Para recibir anuncios nuevos incluso con la aplicación cerrada, falta conectar el servidor Push del seminario.',
        icon: new URL('./assets/icon-192.png', document.baseURI).href,
        tag: 'stbcor-permission-check'
      });
      message('Permiso concedido. El servicio Push de anuncios requiere configuración adicional del servidor.');
    } catch (error) {
      message('No se pudo mostrar la notificación: ' + error.message);
    }
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstall = event;
    addControls();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    const button = $('.pwa-install');
    if (button) button.hidden = true;
    message('STBCOr se instaló correctamente.');
  });

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', async () => {
      try {
        registration = await navigator.serviceWorker.register('./service-worker.js', { scope: './', updateViaCache: 'none' });
        addControls();
        if (registration.waiting) showUpdate();
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
          });
        });
        const checkUpdate = () => registration && registration.update().catch(() => {});
        window.addEventListener('focus', checkUpdate);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkUpdate();
        });
      } catch (error) {
        console.error('No se pudo registrar la PWA:', error);
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadAfterUpdate) window.location.reload();
    });
  }

  const observer = new MutationObserver(addControls);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') addControls();
  else document.addEventListener('DOMContentLoaded', addControls);
})();