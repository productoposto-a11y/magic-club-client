import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { setTokens } from '../../core/api/axios';
import { authenticateMagicLink } from '../../core/auth/authService';
import { parseJwt } from '../../core/auth/parseJwt';
import { extractApiError } from '../../core/api/errors';
import { useAuth } from '../../core/auth/AuthContext';

export default function MagicLinkCallback() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [error, setError] = useState('');
    const hasRun = useRef(false);
    const navigate = useNavigate();
    const { loginWithTokens } = useAuth();

    useEffect(() => {
        if (hasRun.current) return;
        hasRun.current = true;

        if (!token) {
            setError('Enlace inválido o expirado.');
            return;
        }

        const authenticateToken = async () => {
            try {
                const data = await authenticateMagicLink(token);

                const accessToken = data.authentication.access_token;
                const csrfToken = data.authentication.csrf_token;

                setTokens(accessToken, csrfToken);

                const decoded = parseJwt(accessToken);
                if (!decoded) {
                    setError('Error procesando el token.');
                    return;
                }

                loginWithTokens(accessToken, csrfToken, {
                    id: decoded.sub,
                    email: decoded.email,
                    role: decoded.role,
                });

                navigate('/client', { replace: true });
            } catch (err: any) {
                setError(extractApiError(err, 'El enlace mágico ha expirado o ya fue utilizado.'));
            }
        };

        authenticateToken();
    }, [token, loginWithTokens, navigate]);

    if (error) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2 style={{ color: 'var(--color-danger)' }}>Error de Autenticación</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
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
