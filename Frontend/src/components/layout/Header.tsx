import { Bell, Moon } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full h-20 flex items-center justify-between px-8 bg-transparent">
      <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
        {/*Today's Focus*/}
      </span>
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50">
          <Moon size={20} />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/50">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
}
