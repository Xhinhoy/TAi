// Polyfills para React Native
// Este archivo debe cargarse ANTES que cualquier otro módulo

// Solo aplicar polyfills si NO estamos en un entorno web
const isWeb = typeof navigator !== 'undefined' && navigator.product === 'ReactNative' ? false : true;

if (!isWeb) {
  // Polyfill para document (requerido por react-native-markdown-display)
  if (typeof document === 'undefined') {
    global.document = {
      createElement: () => ({}),
      createElementNS: () => ({}),
      getElementsByTagName: () => [],
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      body: {},
      head: {},
    };
  }
}
