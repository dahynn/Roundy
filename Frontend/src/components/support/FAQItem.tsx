import { HelpCircle, ChevronDown } from 'lucide-react';

interface FAQItemProps {
    category: string;
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}

export default function FAQItem({ category, question, answer, isOpen, onToggle }: FAQItemProps) {
    return (
        <div
            className={`bg-white/80 dark:bg-black/40 backdrop-blur-xl border transition-all duration-300 rounded-[32px] overflow-hidden ${isOpen
                    ? 'border-[#7C3AED] shadow-xl shadow-purple-100 dark:shadow-none'
                    : 'border-white dark:border-white/10 shadow-sm hover:shadow-md'
                }`}
        >
            <button
                onClick={onToggle}
                className="w-full text-left p-6 md:p-8 flex items-center justify-between gap-4"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-[#7C3AED] text-white' : 'bg-purple-50 dark:bg-purple-900/20 text-[#7C3AED]'
                        }`}>
                        <HelpCircle size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-widest">{category}</span>
                        <h3 className={`text-lg font-black transition-colors ${isOpen ? 'text-[#7C3AED]' : 'text-[#1A1F36] dark:text-white'}`}>
                            {question}
                        </h3>
                    </div>
                </div>
                <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#7C3AED]' : 'text-gray-300'}`}>
                    <ChevronDown size={22} />
                </div>
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                <div className="px-6 md:px-8 pb-8 pt-2 ml-14">
                    <div className="p-6 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                        <p className="text-[#697386] dark:text-gray-400 leading-relaxed font-medium">
                            {answer}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
