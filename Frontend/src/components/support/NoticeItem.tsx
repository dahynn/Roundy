import { Megaphone, Calendar, ChevronRight } from 'lucide-react';

interface NoticeItemProps {
    title: string;
    content: string;
    date: string;
    isNew?: boolean;
}

export default function NoticeItem({ title, content, date, isNew = false }: NoticeItemProps) {
    return (
        <div className="bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white dark:border-white/10 rounded-[32px] p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none transition-all duration-300 group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center text-[#FF4D94]">
                        <Megaphone size={20} />
                    </div>
                    {isNew && (
                        <span className="px-2.5 py-1 bg-gradient-to-r from-[#FF4D94] to-[#7C3AED] text-white text-[10px] font-black rounded-lg">NEW</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold">
                    <Calendar size={14} />
                    {date}
                </div>
            </div>

            <h3 className="text-xl font-black text-[#1A1F36] dark:text-white mb-3 group-hover:text-[#FF4D94] transition-colors">{title}</h3>
            <p className="text-[#697386] dark:text-gray-400 leading-relaxed font-medium">
                {content}
            </p>

            <div className="mt-6 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-[#FF4D94] group-hover:text-white transition-all">
                    <ChevronRight size={18} />
                </div>
            </div>
        </div>
    );
}
