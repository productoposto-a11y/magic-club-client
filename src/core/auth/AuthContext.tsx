import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, setTokens } from '../api/axios';

interface AuthUser {
    id: string;
    email: string;
    role: 'admin' | 'store_cashier' | 'client';
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    loginWithTokens: (accessToken: string, csrfToken: string, userClaims: AuthUser) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    // Parse JWT payload to extract user claims
    const parseJwt = (token: string): AuthUser | null => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            const decoded = JSON.parse(jsonPayload);
            return {
                id: decoded.sub,
                email: decoded.email,
                role: decoded.role,
            };
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        // Attempt auto-login smoothly on boot by triggering the refresh endpoint
        const attemptSilentRefresh = async () => {
            try {
                const res = await apiClient.post('/tokens/refresh');
                const token = res.data.authentication.access_token;
                const csrf = res.data.authentication.csrf_token;

                setTokens(token, csrf);
                const userData = parseJwt(token);
                if (userData) {
                    setUser(userData);
                }
            } catch (err) {
                // Expected if no cookie exists or expired. Remain anonymous.
                console.log('No valid session found during boot.');
            } finally {
                setLoading(false);
            }
        };

        attemptSilentRefresh();
    }, []);

    const loginWithTokens = (accessToken: string, csrfToken: string, userClaims: AuthUser) => {
        setTokens(accessToken, csrfToken);
        setUser(userClaims);
    };

    const logout = async () => {
        try {
            await apiClient.post('/tokens/logout');
        } catch {
            // Ignore network errors on logout
        } finally {
            setTokens('', '');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, loginWithTokens, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
