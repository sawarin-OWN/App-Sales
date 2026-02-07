import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Set viewport height to actual screen height (for mobile browsers with address bar)
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Check if in standalone mode (PWA) - Enhanced detection
function isStandaloneMode() {
  // Method 1: Check display-mode media query (most reliable)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Method 2: Check iOS standalone (iOS specific)
  if (window.navigator.standalone === true) {
    return true;
  }
  
  // Method 3: Check Android standalone
  if (document.referrer.includes('android-app://')) {
    return true;
  }
  
  return false;
}

// Apply standalone mode classes and force fullscreen
function applyStandaloneMode() {
  const isStandalone = isStandaloneMode();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    document.documentElement.classList.add('mobile-device');
    document.body.classList.add('mobile-device');
    
    if (isStandalone) {
      document.documentElement.classList.add('standalone-mode');
      document.body.classList.add('standalone-mode');
      
      // Force fullscreen in standalone mode
      document.documentElement.style.height = '100vh';
      document.documentElement.style.height = '100dvh';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.top = '0';
      document.documentElement.style.left = '0';
      document.documentElement.style.right = '0';
      document.documentElement.style.bottom = '0';
      document.documentElement.style.width = '100%';
      document.documentElement.style.overflow = 'hidden';
      
      document.body.style.height = '100vh';
      document.body.style.height = '100dvh';
      document.body.style.position = 'fixed';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      
      // Make root scrollable
      const root = document.getElementById('root');
      if (root) {
        root.style.height = '100vh';
        root.style.height = '100dvh';
        root.style.overflowY = 'auto';
        root.style.overflowX = 'hidden';
        root.style.position = 'relative';
        root.style.width = '100%';
        root.style.webkitOverflowScrolling = 'touch';
      }
    }
  } else {
    document.documentElement.classList.remove('standalone-mode', 'mobile-device');
    document.body.classList.remove('standalone-mode', 'mobile-device');
  }
}

// Hide address bar aggressively (for non-standalone mobile browsers)
function hideAddressBar() {
  const isStandalone = isStandaloneMode();
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Only try to hide address bar if not in standalone mode
  if (isMobile && !isStandalone) {
    const hideBar = () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
      window.scrollTo(0, currentScroll + 1);
      setTimeout(() => {
        window.scrollTo(0, currentScroll);
        setViewportHeight();
      }, 10);
    };
    
    // Try multiple times
    hideBar();
    setTimeout(hideBar, 100);
    setTimeout(hideBar, 300);
    setTimeout(hideBar, 500);
    
    // Hide on scroll
    window.addEventListener('scroll', hideBar, { passive: true });
    window.addEventListener('touchstart', hideBar, { passive: true });
  }
}

// Initialize - Aggressive fullscreen approach
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setViewportHeight();
    applyStandaloneMode();
    hideAddressBar();
  });
} else {
  setViewportHeight();
  applyStandaloneMode();
  hideAddressBar();
}

// Update on resize and orientation change
window.addEventListener('resize', () => {
  setViewportHeight();
  applyStandaloneMode();
  hideAddressBar();
});

window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    setViewportHeight();
    applyStandaloneMode();
    hideAddressBar();
  }, 300);
});

// Also try after delays
setTimeout(() => {
  applyStandaloneMode();
  hideAddressBar();
}, 100);
setTimeout(() => {
  applyStandaloneMode();
  hideAddressBar();
}, 500);
setTimeout(() => {
  applyStandaloneMode();
  hideAddressBar();
}, 1000);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

