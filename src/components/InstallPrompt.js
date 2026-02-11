import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone || 
                      document.referrer.includes('android-app://');
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // If already in standalone mode, don't show prompt
    if (standalone) {
      return;
    }

    // Check if prompt was dismissed before
    const promptDismissed = localStorage.getItem('installPromptDismissed');
    if (promptDismissed) {
      return;
    }

    // Show prompt immediately for better visibility
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1000);

    // Listen for beforeinstallprompt event (Android Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android Chrome
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        Swal.fire({
          icon: 'success',
          title: 'ติดตั้งสำเร็จ!',
          text: 'แอปจะเปิดในโหมดเต็มจอ',
          timer: 2000,
          showConfirmButton: false
        });
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem('installPromptDismissed', 'true');
    } else if (isIOS) {
      // iOS Safari - show instructions
      Swal.fire({
        icon: 'info',
        title: 'เพิ่มไปหน้าแรก',
        html: `
          <div style="text-align: left;">
            <p><strong>วิธีเพิ่มแอปไปหน้าแรก:</strong></p>
            <ol style="margin-left: 20px;">
              <li>แตะปุ่ม <strong>แชร์</strong> <i class="fas fa-share"></i> ที่ด้านล่าง</li>
              <li>เลือก <strong>"เพิ่มไปหน้าแรก"</strong> หรือ <strong>"Add to Home Screen"</strong></li>
              <li>แตะ <strong>"เพิ่ม"</strong> เพื่อยืนยัน</li>
            </ol>
            <p style="margin-top: 15px; color: #059669; font-weight: bold;">
              เมื่อเพิ่มแล้ว แอปจะแสดงเต็มจอโดยไม่มีแถบเว็บไซต์
            </p>
          </div>
        `,
        confirmButtonText: 'เข้าใจแล้ว',
        confirmButtonColor: '#059669'
      });
      setShowPrompt(false);
      localStorage.setItem('installPromptDismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 text-white p-4 shadow-lg z-50 md:hidden" style={{ background: 'linear-gradient(90deg, #1a4781, #4CAF50)' }}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex-1">
          <p className="font-bold text-sm mb-1">
            <i className="fas fa-mobile-alt mr-2"></i>
            เพิ่มแอปไปหน้าแรก
          </p>
          <p className="text-xs opacity-90">
            เพื่อประสบการณ์เต็มจอและใช้งานง่ายขึ้น
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleInstall}
            className="bg-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition text-yod-green"
          >
            <i className="fas fa-plus-circle mr-1"></i>
            เพิ่ม
          </button>
          <button
            onClick={handleDismiss}
            className="text-white hover:text-gray-200 p-2"
            title="ปิด"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallPrompt;

