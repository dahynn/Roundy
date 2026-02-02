import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export default function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full h-20 flex items-center justify-between px-8 bg-transparent">
      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
        {/*Today's Focus*/}
      </span>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-white/50 dark:hover:bg-white/10 transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
