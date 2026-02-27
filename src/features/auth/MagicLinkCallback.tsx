import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient, setTokens } from '../../core/api/axios';

export default function MagicLinkCallback() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [error, setError] = useState('');

    // Use the global AuthContext function to parse claims natively since attemptSilentRefresh handles it on boot
    // but here we are receiving fresh tokens manually via URL callback

    useEffect(() => {
        if (!token) {
            setError('Enlace inválido o expirado.');
            return;
        }

        const authenticateToken = async () => {
            try {
                const res = await apiClient.post('/users/magic-link/authenticate', { token });

                // Save the HttpOnly cookie happens automatically by the browser. 
                // We just need to persist the short-lived ones in memory.
                const accessToken = res.data.authentication.access_token;
                const csrfToken = res.data.authentication.csrf_token;

                // Set the tokens globally so sub-sequent requests don't fail CSRF
                setTokens(accessToken, csrfToken);

                // Best way to sync state is to simply reload the page, so the boot SilentRefresh reads everything securely
                window.location.href = '/client';
            } catch (err: any) {
                setError(err.response?.data?.error?.message || 'El enlace mágico ha expirado o ya fue utilizado.');
            }
        };

        authenticateToken();
    }, [token]);

    if (error) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2 style={{ color: 'var(--color-danger)' }}>Error de Autenticación</h2>
                <p>{error}</p>
                <button onClick={() => window.location.href = '/login'} className="btn btn-primary" style={{ marginTop: '1rem' }}>
                    Volver al Inicio
                </button>
            </div>
        );
    }

    return (
        <div className="loader-container">
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Verificando magia...</p>
        </div>
    );
}
