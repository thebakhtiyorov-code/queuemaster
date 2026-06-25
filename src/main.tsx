import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against ResizeObserver loop warnings and cross-origin iframe script errors
if (typeof window !== 'undefined') {
  // Classic window.onerror return true is the most bulletproof way to suppress script errors
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || '').toLowerCase();
    if (
      !message ||
      msg.includes('script error') ||
      msg.includes('resizeobserver') ||
      msg.includes('resize observer') ||
      (source && (source.includes('chrome-extension') || source.includes('moz-extension')))
    ) {
      return true; // suppresses the error
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };

  window.addEventListener('error', (e) => {
    if (!e) return;

    // Prevent resource/loading errors from bubbling up (e.target is script/link/img)
    const target = e.target as any;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK' || target.tagName === 'IMG' || target.src || target.href)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      return;
    }

    const msg = String(e.message || (e.error && e.error.message) || '').toLowerCase();
    if (
      !msg ||
      msg.includes('resizeobserver') ||
      msg.includes('script error') ||
      msg.includes('resize observer')
    ) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    e.preventDefault();
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
