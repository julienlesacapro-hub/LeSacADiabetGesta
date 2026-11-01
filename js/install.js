// Installation de l'application sur l'écran d'accueil (PWA).
import { toast } from './ui.js';

let deferredPrompt = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initInstall() {
  // Chrome, Edge, Samsung Internet (Android) : proposition d'installation interceptée
  // pour l'afficher au bon moment, via un bouton de l'application.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
    toast('Application installée : retrouvez « LeSacADiabetGesta » parmi vos applications', { duration: 5000 });
  });
}

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    navigator.standalone === true
  );
}

export function detectPlatform(ua = navigator.userAgent, nav = navigator) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  // Navigateurs intégrés (WhatsApp, Facebook, Instagram, Gmail/Google, Snapchat, LinkedIn…) :
  // l'installation n'y est pas possible.
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|LinkedInApp|GSA\/|WhatsApp|; wv\)/.test(ua);
  const samsung = /SamsungBrowser/.test(ua);
  const firefox = /Firefox|FxiOS/.test(ua);
  const iosOtherBrowser = ios && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return { ios, android, inApp, samsung, firefox, iosSafari: ios && !iosOtherBrowser && !inApp, iosOtherBrowser };
}

export function canPromptInstall() {
  return !!deferredPrompt;
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const ev = deferredPrompt;
  deferredPrompt = null;
  ev.prompt();
  const choice = await ev.userChoice.catch(() => ({ outcome: 'dismissed' }));
  emit();
  return choice.outcome;
}

const DISMISS_KEY = 'lsadg:install-banner-dismissed';

export function bannerDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissBanner() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* préférence facultative */
  }
}
