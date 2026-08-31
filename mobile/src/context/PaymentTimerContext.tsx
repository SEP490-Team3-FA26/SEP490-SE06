import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PaymentAPI } from '../services/paymentApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PaymentTimerState {
    isTimerActive: boolean;
    endTime: number | null;
    paymentUrl: string | null;
    orderCode: string | number | null;
    eventInfo: {
        eventId: string;
        title: string;
    } | null;
    totalAmount: number;
    seatCount: number;
}

interface PaymentTimerContextType extends PaymentTimerState {
    startTimer: (
        durationSeconds: number,
        paymentUrl: string,
        orderCode: string | number,
        eventInfo: { eventId: string; title: string },
        totalAmount: number,
        seatCount: number
    ) => void;
    stopTimer: () => void;
    cancelPayment: () => Promise<void>;
    timeLeft: number | null;
}

const STORAGE_KEY = '@payment_timer_state';

const PaymentTimerContext = createContext<PaymentTimerContextType | undefined>(undefined);

export const PaymentTimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<PaymentTimerState>({
        isTimerActive: false,
        endTime: null,
        paymentUrl: null,
        orderCode: null,
        eventInfo: null,
        totalAmount: 0,
        seatCount: 0,
    });

    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    // Load from AsyncStorage
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(saved => {
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.endTime && Date.now() < parsed.endTime) {
                        setState(parsed);
                    } else {
                        AsyncStorage.removeItem(STORAGE_KEY);
                    }
                } catch { }
            }
        });
    }, []);

    // Save to AsyncStorage
    useEffect(() => {
        if (state.isTimerActive) {
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } else {
            AsyncStorage.removeItem(STORAGE_KEY);
        }
    }, [state]);

    // Countdown Timer
    useEffect(() => {
        if (!state.isTimerActive || !state.endTime) {
            setTimeLeft(null);
            return;
        }

        const tick = () => {
            const remaining = Math.max(0, Math.floor((state.endTime! - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) {
                // Expired
                setState(prev => ({ ...prev, isTimerActive: false }));
            }
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [state.isTimerActive, state.endTime]);

    // Auto-sync với backend khi đang có đơn chờ thanh toán.
    // Nếu verify thấy đơn không còn ở trạng thái pending/processing => tắt timer.
    useEffect(() => {
        if (!state.isTimerActive || !state.orderCode) return;

        let cancelled = false;

        const syncPaymentStatus = async () => {
            try {
                const result = await PaymentAPI.verifyPayment(Number(state.orderCode));
                const status = result?.status;

                if (cancelled) return;

                if (status && status !== 'pending' && status !== 'processing') {
                    setState(prev => ({ ...prev, isTimerActive: false }));
                }
            } catch (error) {
                console.warn('[PaymentTimer] Failed to sync payment status:', (error as any)?.message || error);
            }
        };

        syncPaymentStatus();

        return () => {
            cancelled = true;
        };
    }, [state.isTimerActive, state.orderCode]);

    const startTimer = (
        durationSeconds: number,
        paymentUrl: string,
        orderCode: string | number,
        eventInfo: { eventId: string; title: string },
        totalAmount: number,
        seatCount: number
    ) => {
        setState({
            isTimerActive: true,
            endTime: Date.now() + durationSeconds * 1000,
            paymentUrl,
            orderCode,
            eventInfo,
            totalAmount,
            seatCount,
        });
    };

    const stopTimer = () => {
        setState(prev => ({ ...prev, isTimerActive: false }));
    };

    const cancelPayment = async () => {
        if (state.orderCode) {
            try {
                await PaymentAPI.cancelPayment(state.orderCode);
            } catch (error) {
                console.error('Failed to cancel payment:', error);
            }
        }
        stopTimer();
    };

    return (
        <PaymentTimerContext.Provider value={{ ...state, startTimer, stopTimer, cancelPayment, timeLeft }}>
            {children}
        </PaymentTimerContext.Provider>
    );
};

export const usePaymentTimer = () => {
    const context = useContext(PaymentTimerContext);
    if (context === undefined) {
        throw new Error('usePaymentTimer must be used within a PaymentTimerProvider');
    }
    return context;
};