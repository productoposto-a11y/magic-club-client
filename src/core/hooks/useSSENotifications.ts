import { useEffect, useRef } from 'react';
import { getAccessToken } from '../api/axios';

export interface SSEEventData {
    type: 'purchase_registered' | 'reward_redeemed';
    data: Record<string, unknown>;
}

interface UseSSENotificationsOptions {
    onEvent: (event: SSEEventData) => void;
    enabled: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/v1';

export function useSSENotifications({ onEvent, enabled }: UseSSENotificationsOptions) {
    const onEventRef = useRef(onEvent);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        if (!enabled) return;

        let eventSource: EventSource | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout>;
        let closed = false;

        function connect() {
            if (closed) return;

            const token = getAccessToken();
            if (!token) return;

            eventSource = new EventSource(`${API_URL}/events?token=${encodeURIComponent(token)}`);

            const handleEvent = (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data);
                    onEventRef.current({ type: e.type as SSEEventData['type'], data });
                } catch {
                    // Ignore malformed events
                }
            };

            eventSource.addEventListener('purchase_registered', handleEvent);
            eventSource.addEventListener('reward_redeemed', handleEvent);

            eventSource.onerror = () => {
                eventSource?.close();
                eventSource = null;

                // Reconnect after 5s, using a fresh token in case it was refreshed
                if (!closed) {
                    reconnectTimeout = setTimeout(connect, 5000);
                }
            };
        }

        connect();

        return () => {
            closed = true;
            clearTimeout(reconnectTimeout);
            eventSource?.close();
        };
    }, [enabled]);
}
