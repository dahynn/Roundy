import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Mail, User, Heart } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <Home size={22} />, label: '홈', path: '/home' },
    { icon: <Mail size={22} />, label: '쪽지함', path: '/messages' },
    { icon: <User size={22} />, label: '마이페이지', path: '/mypage' }, // 경로 일치 확인
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 p-8 flex flex-col gap-10 z-50">
      <div
        className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        onClick={() => navigate('/home')}
      >
        <div className="w-9 h-9 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg shadow-pink-100">
          <Heart size={20} fill="white" className="text-white" />
        </div>
        <span className="text-2xl font-black text-[#1A1F36] tracking-tighter">Roundy</span>
      </div>

      <div className="flex flex-col gap-3">
        {menuItems.map((item) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all ${
              location.pathname === item.path
                ? 'bg-[#FDF2F8] text-[#FF4D94] shadow-sm'
                : 'text-[#8792A2] hover:bg-gray-50 hover:text-[#1A1F36]'
            }`}
          >
            <div className={location.pathname === item.path ? 'text-[#FF4D94]' : 'text-[#8792A2]'}>
              {item.icon}
            </div>
            <span className="font-bold text-[16px]">{item.label}</span>
          </div>
        ))}
      </div>
    </nav>
  );
}
