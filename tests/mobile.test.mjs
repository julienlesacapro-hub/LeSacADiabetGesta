import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initViewport } from '../js/viewport.js';
import { detectPlatform } from '../js/install.js';

/** Fenêtre factice minimale pour tester le calcul de la zone visible. */
function fakeWindow({ innerHeight, vvHeight, offsetTop = 0, focused = 'INPUT' }) {
  const vars = {};
  const classes = new Set();
  const vvListeners = {};
  const win = {
    innerHeight,
    visualViewport: {
      height: vvHeight,
      offsetTop,
      addEventListener: (t, fn) => { vvListeners[t] = fn; },
    },
    requestAnimationFrame: (fn) => { fn(); return 1; },
    addEventListener: () => {},
    document: {
      activeElement: focused ? { tagName: focused, type: 'text' } : null,
      documentElement: { style: { setProperty: (k, v) => { vars[k] = v; } } },
      body: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } },
      addEventListener: () => {},
    },
  };
  return { win, vars, classes, vvListeners };
}

test('clavier iPhone : la zone masquée est mesurée et la classe kb-open posée', () => {
  const f = fakeWindow({ innerHeight: 844, vvHeight: 844, focused: null });
  const measure = initViewport(f.win);
  assert.equal(f.vars['--kb'], '0px');
  assert.equal(f.classes.has('kb-open'), false);
  // Ouverture du clavier : la zone visible passe à 508 px.
  f.win.document.activeElement = { tagName: 'INPUT', type: 'text' };
  f.win.visualViewport.height = 508;
  measure();
  assert.equal(f.vars['--kb'], '336px');
  assert.equal(f.vars['--vv-h'], '508px');
  assert.equal(f.classes.has('kb-open'), true);
});

test('clavier iPhone avec page décalée (offsetTop) : la feuille reste collée au clavier', () => {
  const f = fakeWindow({ innerHeight: 844, vvHeight: 500, offsetTop: 40 });
  initViewport(f.win);
  assert.equal(f.vars['--kb'], '304px');
});

test('Android (resizes-content) : la page rétrécit, le clavier est détecté par comparaison', () => {
  const f = fakeWindow({ innerHeight: 800, vvHeight: 800, focused: null });
  const measure = initViewport(f.win);
  f.win.document.activeElement = { tagName: 'INPUT', type: 'text' };
  f.win.innerHeight = 470;
  f.win.visualViewport.height = 470;
  measure();
  assert.equal(f.vars['--kb'], '0px');
  assert.equal(f.classes.has('kb-open'), true);
});

test('un sélecteur de date ne compte pas comme un clavier', () => {
  const f = fakeWindow({ innerHeight: 844, vvHeight: 600 });
  f.win.document.activeElement = { tagName: 'INPUT', type: 'date' };
  initViewport(f.win);
  assert.equal(f.classes.has('kb-open'), false);
});

test('détection du navigateur pour l’aide à l’installation', () => {
  const iphoneSafari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const iphoneChrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
  const androidChrome = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
  const androidWebView = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36';
  const facebook = `${iphoneSafari} [FBAN/FBIOS;FBAV/480.0]`;
  const samsung = 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36';
  const nav = { platform: 'Linux', maxTouchPoints: 5 };
  assert.equal(detectPlatform(iphoneSafari, nav).iosSafari, true);
  assert.equal(detectPlatform(iphoneChrome, nav).iosOtherBrowser, true);
  assert.equal(detectPlatform(iphoneChrome, nav).iosSafari, false);
  assert.deepEqual([detectPlatform(androidChrome, nav).android, detectPlatform(androidChrome, nav).inApp], [true, false]);
  assert.equal(detectPlatform(androidWebView, nav).inApp, true);
  assert.equal(detectPlatform(facebook, nav).inApp, true);
  assert.equal(detectPlatform(facebook, nav).iosSafari, false);
  assert.equal(detectPlatform(samsung, nav).samsung, true);
});
