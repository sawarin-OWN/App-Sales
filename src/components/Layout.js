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
    <div className="min-h-[100dvh] bg-gray-50" style={{ minHeight: 'calc(100dvh + 1px)' }}>
      {/* Header with Safe Area Support */}
      <header 
        className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg fixed left-0 right-0 z-40"
        style={{
          top: `calc(env(safe-area-inset-top, 0px) + 8px)`,
          paddingTop: '8px',
          paddingBottom: '12px'
        }}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg p-2.5 shadow-lg">
                <i className="fas fa-chart-line text-xl text-white"></i>
              </div>
              <div>
                <h1 className="font-bold text-lg">
                  {(user?.email?.toLowerCase().includes('admin') || user?.role === 'admin') ? 'หลังบ้าน (Admin)' : user?.branchName || 'Sales Dashboard'}
                </h1>
                <p className="text-xs text-gray-400 font-mono">{user?.role === 'admin' ? '' : (user?.branchCode || '')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="รีเฟรช"
              >
                <i className="fas fa-sync-alt text-xl"></i>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-white/10 rounded-lg transition"
                title="ออกจากระบบ"
              >
                <i className="fas fa-sign-out-alt text-xl"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Menu Tabs — แอดมินเท่านั้นเห็น หลังบ้าน; สำนักงานเห็นแค่ยอดขายสำนักงาน; สาขาเห็นเฉพาะเมนูสาขา (ไม่มีหลังบ้าน) */}
        <div className="border-t border-gray-700 bg-gray-800">
          <div className="container mx-auto px-4">
            <div className="flex overflow-x-auto space-x-1">
              {user?.role === 'office' ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/dashboard') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-chart-line mr-2"></i>ภาพรวม
                  </button>
                  <button
                    onClick={() => navigate('/office-sales')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/office-sales') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-building mr-2"></i>ยอดขายสำนักงาน
                  </button>
                  <button
                    onClick={() => navigate('/expenses')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/expenses') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-file-invoice-dollar mr-2"></i>ค่าใช้จ่าย
                  </button>
                  <button
                    onClick={() => navigate('/tax-invoices')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/tax-invoices') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-file-invoice mr-2"></i>ใบกำกับภาษี
                  </button>
                  <button
                    onClick={() => navigate('/profit-loss')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/profit-loss') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-balance-scale mr-2"></i>งบกำไรขาดทุน
                  </button>
                </>
              ) : (user?.email?.toLowerCase().includes('admin') || user?.role === 'admin') ? (
                <button
                  onClick={() => navigate('/admin')}
                  className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                    isActive('/admin') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                  }`}
                >
                  <i className="fas fa-user-shield mr-2"></i>หลังบ้าน
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/dashboard') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-chart-line mr-2"></i>ภาพรวม
                  </button>
                  <button
                    onClick={() => navigate('/sales')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/sales') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-cash-register mr-2"></i>ปิดยอด
                  </button>
                  <button
                    onClick={() => navigate('/expenses')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/expenses') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-file-invoice-dollar mr-2"></i>ค่าใช้จ่าย
                  </button>
                  <button
                    onClick={() => navigate('/deposits')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/deposits') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-university mr-2"></i>นำฝาก
                  </button>
                  <button
                    onClick={() => navigate('/tax-invoices')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/tax-invoices') ? 'border-white active' : 'border-transparent hover:border-gray-500'
                    }`}
                  >
                    <i className="fas fa-file-invoice mr-2"></i>ใบกำกับภาษี
                  </button>
                  <button
                    onClick={() => navigate('/profit-loss')}
                    className={`tab-btn flex-none px-6 py-3 text-sm font-bold border-b-2 ${
                      isActive('/profit-loss') ? 'border-white active' : 'border-transparent hover:border-gray-500'
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

      {/* Main Content - Add margin-top to account for fixed header */}
      <main 
        className="container mx-auto px-4 py-6 space-y-6 pb-20" 
        style={{ 
          minHeight: 'calc(calc(var(--vh, 1vh) * 100) - 200px)',
          marginTop: 'calc(env(safe-area-inset-top, 0px) + 136px)'
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

