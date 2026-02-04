import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType, duration?: number) => void;
    confirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        message: string;
        onConfirm: () => void;
        onCancel?: () => void;
    } | null>(null);

    const toast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const confirm = useCallback((message: string, onConfirm: () => void, onCancel?: () => void) => {
        setConfirmModal({ isOpen: true, message, onConfirm, onCancel });
    }, []);

    const closeConfirm = () => setConfirmModal(null);

    return (
        <ToastContext.Provider value={{ toast, confirm }}>
            {children}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`
              pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-xl backdrop-blur-md border animate-in slide-in-from-bottom-5 fade-in duration-300
              ${t.type === 'success' ? 'bg-white/90 border-[#FF4D94]/20 text-[#1A1F36]' : ''}
              ${t.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-600' : ''}
              ${t.type === 'info' ? 'bg-white/90 border-gray-200 text-gray-700' : ''}
            `}
                    >
                        {t.type === 'success' && <CheckCircle className="text-[#FF4D94] shrink-0" size={20} />}
                        {t.type === 'error' && <AlertCircle className="text-red-500 shrink-0" size={20} />}
                        {t.type === 'info' && <Info className="text-[#7C3AED] shrink-0" size={20} />}
                        <p className="text-sm font-bold flex-1">{t.message}</p>
                        <button
                            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* 커스텀 Confirm 모달 */}
            {confirmModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-8 w-[90%] max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-black text-[#1A1F36] mb-3 text-center">알림</h3>
                        <p className="text-gray-500 text-center mb-8 font-medium break-keep">{confirmModal.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    if (confirmModal.onCancel) confirmModal.onCancel();
                                    closeConfirm();
                                }}
                                className="flex-1 py-3.5 bg-gray-100 text-gray-400 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => {
                                    confirmModal.onConfirm();
                                    closeConfirm();
                                }}
                                className="flex-1 py-3.5 bg-[#FF4D94] text-white rounded-2xl font-bold shadow-lg shadow-pink-200 hover:bg-[#E63E82] transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
