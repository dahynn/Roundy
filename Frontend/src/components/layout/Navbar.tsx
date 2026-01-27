import React from 'react';
import { Home, Mail, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: '홈', icon: Home, path: '/' },
    { name: '쪽지함', icon: Mail, path: '/messages' },
    { name: '마이페이지', icon: User, path: '/mypage' },
  ];

  return (
    <nav className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-8">
        <div className="flex items-center gap-2 mb-12 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
            R
          </div>
          <span className="text-xl font-bold text-[#1A1F36]">Roundy</span>
        </div>

        <div className="space-y-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive ? 'bg-pink-50 text-pink-600 font-bold' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
