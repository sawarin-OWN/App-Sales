import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    Swal.fire({
      title: 'ต้องการออกจากระบบ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate('/login');
      }
    });
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div 
      className="min-h-0 flex flex-col flex-1 w-full overflow-hidden"
      style={{ backgroundColor: '#f0fdf4', minHeight: '100dvh', height: '100%' }}
    >
      {/* Navbar แถบเมนูด้านบน — อยู่นอก scroll container เพื่อไม่ให้มือถือวาดเนื้อหาซ้อนทับ */}
      <header 
        className="fixed left-0 right-0 w-full text-gray-800 shadow-lg border-b border-gray-200 overflow-hidden nav-bar-opaque"
        style={{
          top: `calc(env(safe-area-inset-top, 0px) + 8px)`,
          paddingTop: '8px',
          paddingBottom: '12px',
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
          zIndex: 9999,
          boxShadow: 'inset 0 0 0 9999px #ffffff'
        }}
      >
        {/* ชั้นพื้นหลังทึบ (inline style) ป้องกันมือถือแสดงผลโปร่งใส — ขาว */}
        <div 
          className="absolute inset-0 z-0"
          style={{ backgroundColor: '#ffffff', boxShadow: 'inset 0 0 0 9999px #ffffff' }}
          aria-hidden="true"
        />
        <div className="container mx-auto px-4 py-2 relative z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ minWidth: '2.75rem', minHeight: '2.75rem' }}>
                <img
                  src="https://arilermjxqvmkvmzzzpz.supabase.co/storage/v1/object/public/Icon/MENU%20(7).png"
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-bold text-lg">
                  {(user?.email?.toLowerCase().includes('admin') || user?.role === 'admin') ? 'หลังบ้าน (Admin)' : user?.branchName || 'KebYod App'}
                </h1>
                <p className="text-xs text-gray-600 font-mono">{user?.role === 'admin' ? '' : (user?.branchCode || '')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-700"
                title="รีเฟรช"
              >
                <i className="fas fa-sync-alt text-xl"></i>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-green-200/80 rounded-lg transition text-gray-700"
                title="ออกจากระบบ"
              >
                <i className="fas fa-sign-out-alt text-xl"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Menu Tabs — แถบแท็บพื้นหลังทึบ (inline + boxShadow) */}
        <div 
          className="border-t border-blue-800/30 relative z-10"
          style={{ backgroundColor: '#12467d', boxShadow: 'inset 0 0 0 9999px #12467d' }}
        >
          <div className="container mx-auto px-4">
            <div className="flex overflow-x-auto space-x-1">
              {user?.role === 'office' ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/dashboard') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-chart-line mr-2"></i>ภาพรวม
                  </button>
                  <button
                    onClick={() => navigate('/office-sales')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/office-sales') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-building mr-2"></i>ยอดขายสำนักงาน
                  </button>
                  <button
                    onClick={() => navigate('/expenses')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/expenses') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-file-invoice-dollar mr-2"></i>ค่าใช้จ่าย
                  </button>
                  <button
                    onClick={() => navigate('/tax-invoices')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/tax-invoices') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-file-invoice mr-2"></i>ใบกำกับภาษี
                  </button>
                  <button
                    onClick={() => navigate('/profit-loss')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/profit-loss') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-balance-scale mr-2"></i>งบกำไรขาดทุน
                  </button>
                </>
              ) : (user?.email?.toLowerCase().includes('admin') || user?.role === 'admin') ? (
                <button
                  onClick={() => navigate('/admin')}
                  className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                    isActive('/admin') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                  }`}
                >
                  <i className="fas fa-user-shield mr-2"></i>หลังบ้าน
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/dashboard') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-chart-line mr-2"></i>ภาพรวม
                  </button>
                  <button
                    onClick={() => navigate('/sales')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/sales') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-cash-register mr-2"></i>ปิดยอด
                  </button>
                  <button
                    onClick={() => navigate('/expenses')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/expenses') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-file-invoice-dollar mr-2"></i>ค่าใช้จ่าย
                  </button>
                  <button
                    onClick={() => navigate('/deposits')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/deposits') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-university mr-2"></i>นำฝาก
                  </button>
                  <button
                    onClick={() => navigate('/tax-invoices')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/tax-invoices') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-file-invoice mr-2"></i>ใบกำกับภาษี
                  </button>
                  <button
                    onClick={() => navigate('/profit-loss')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/profit-loss') ? 'border-yod-green active' : 'border-transparent hover:border-yod-green-pale'
                    }`}
                  >
                    <i className="fas fa-balance-scale mr-2"></i>งบกำไรขาดทุน
                  </button>
                  {/* เมนูหลังบ้านแสดงเฉพาะแอดมิน — สาขา/ออฟฟิศไม่เห็น */}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main เป็น scroll container เดียว — header อยู่นอก main จึงไม่ซ้อนบนมือถือ */}
      <main 
        className="container mx-auto px-4 py-6 space-y-6 pb-20 flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{ 
          marginTop: 'calc(env(safe-area-inset-top, 0px) + 136px)',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

