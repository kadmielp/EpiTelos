// src/services/notificationService.ts

/**
 * Service to handle premium audio feedback and system-level notifications.
 * Works across Web and Desktop (Tauri) environments.
 */

// @ts-ignore
const isDesktop = !!window.__TAURI__;

export const playNotificationSound = () => {
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();

        const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = audioContext.currentTime;
        // A soft, premium double-chime (E5 -> A5)
        playTone(659.25, now, 0.4, 0.05);
        playTone(880.00, now + 0.12, 0.5, 0.04);
    } catch (e) {
        console.error("Failed to play notification sound", e);
    }
};

export const sendSystemNotification = async (title: string, body: string) => {
    if (isDesktop && (window as any).__TAURI__) {
        try {
            const tauri = (window as any).__TAURI__;
            const permissionGranted = await tauri.notification.isPermissionGranted();
            if (!permissionGranted) {
                const permission = await tauri.notification.requestPermission();
                if (permission !== 'granted') return;
            }
            tauri.notification.sendNotification({ title, body });
        } catch (e) {
            console.error("Failed to send notification via Tauri", e);
        }
    }
};
