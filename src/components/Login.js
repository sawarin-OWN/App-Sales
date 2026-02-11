import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    Swal.fire({
      title: 'กำลังเข้าสู่ระบบ...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const result = await login(email.trim(), password.trim());

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'เข้าสู่ระบบสำเร็จ',
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/dashboard');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'เข้าสู่ระบบไม่สำเร็จ',
        text: result.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      });
      setError(result.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const appIconUrl = 'https://arilermjxqvmkvmzzzpz.supabase.co/storage/v1/object/public/Icon/MENU%20(7).png';

  return (
    <div className="h-dvh flex items-center justify-center p-4" style={{ backgroundColor: '#f0fdf4' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-2xl overflow-hidden shadow-lg bg-white">
            <img src={appIconUrl} alt="KebYod" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">KebYod App</h1>
          <p className="text-gray-600 text-sm">เข้าสู่ระบบเพื่อบันทึกข้อมูลยอดขาย</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fas fa-envelope mr-2 text-yod-green"></i>อีเมล
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-yod-green focus:ring-2 focus:ring-yod-green-pale outline-none"
              placeholder="กรุณากรอกอีเมล"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fas fa-lock mr-2 text-yod-green"></i>รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border-2 border-gray-300 rounded-lg p-3 mobile-input focus:border-yod-green focus:ring-2 focus:ring-yod-green-pale outline-none pr-12"
                placeholder="กรุณากรอกรหัสผ่าน"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full text-white font-bold py-4 rounded-lg shadow-lg transition active:scale-95 text-lg hover:opacity-95 bg-yod-green"
            style={{ backgroundColor: '#4CAF50' }}
          >
            <i className="fas fa-sign-in-alt mr-2"></i>
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

