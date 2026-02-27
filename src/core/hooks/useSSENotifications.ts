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

        let abortController: AbortController | null = null;
        let reconnectTimeout: ReturnType<typeof setTimeout>;
        let closed = false;

        async function connect() {
            if (closed) return;

            const token = getAccessToken();
            if (!token) return;

            abortController = new AbortController();

            try {
                const response = await fetch(`${API_URL}/events`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'bypass-tunnel-reminder': 'true',
                        'ngrok-skip-browser-warning': 'true',
                    },
                    signal: abortController.signal,
                });

                if (!response.ok || !response.body) {
                    throw new Error(`SSE connection failed: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Process complete events (separated by double newline)
                    const parts = buffer.split('\n\n');
                    buffer = parts.pop() || '';

                    for (const part of parts) {
                        if (!part.trim()) continue;

                        let eventType = '';
                        let eventData = '';

                        for (const line of part.split('\n')) {
                            if (line.startsWith('event: ')) {
                                eventType = line.slice(7);
                            } else if (line.startsWith('data: ')) {
                                eventData = line.slice(6);
                            }
                        }

                        if (eventType && eventData) {
                            try {
                                const data = JSON.parse(eventData);
                                onEventRef.current({ type: eventType as SSEEventData['type'], data });
                            } catch {
                                // Ignore malformed events
                            }
                        }
                    }
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
            }

            // Reconnect after 5s with a fresh token (handles token refresh)
            if (!closed) {
                reconnectTimeout = setTimeout(connect, 5000);
            }
        }

        connect();

        return () => {
            closed = true;
            clearTimeout(reconnectTimeout);
            abortController?.abort();
        };
    }, [enabled]);
}
