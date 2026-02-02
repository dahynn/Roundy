import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Mail, User, Heart } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <Home size={22} />, label: 'Home', path: '/home' },
    { icon: <Mail size={22} />, label: 'Message', path: '/messages' },
    { icon: <User size={22} />, label: 'Mypage', path: '/mypage' },
  ];

  return (
    <nav 
      className="fixed left-0 top-0 h-full w-64 p-8 flex flex-col gap-10 z-50
      bg-white/60 dark:bg-black/60
      backdrop-blur-2xl       
      backdrop-saturate-150    
      border-r border-white/30 dark:border-white/5
      shadow-[4px_0_30px_rgba(0,0,0,0.03)]
      transition-colors duration-300
      "
    >
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate('/home')}
      >
        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-xl shadow-lg opacity-90 blur-[1px]" />
          <div className="relative z-10 w-full h-full bg-gradient-to-tr from-[#FF4D94] to-[#7C3AED] rounded-xl flex items-center justify-center border border-white/20">
             <Heart size={20} fill="white" className="text-white drop-shadow-md" />
          </div>
        </div>
        
        <span className="text-2xl font-black text-[#1A1F36] dark:text-white tracking-tighter group-hover:text-[#FF4D94] transition-colors drop-shadow-sm">
          Roundy
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex items-center gap-4 px-5 py-4 rounded-[20px] cursor-pointer transition-all duration-300 overflow-hidden
                ${
                  isActive
                    ? 'shadow-[0_4px_20px_rgba(255,77,148,0.15)] text-[#FF4D94]' 
                    : 'text-[#697386] dark:text-gray-400 hover:bg-white/40 dark:hover:bg-white/5 hover:text-[#1A1F36] dark:hover:text-white'
                }
              `}
            >
              {isActive && (
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-md" />
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white/50 to-transparent opacity-80" />
                    <div className="absolute inset-0 border border-white/60 rounded-[20px]" />
                </div>
              )}

              <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`relative z-10 text-[16px] font-bold ${isActive ? 'tracking-wide' : ''}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}