import React, { useState } from 'react';
import { setTokens } from '../../core/api/axios';
import { useAuth } from '../../core/auth/AuthContext';
import { parseJwt } from '../../core/auth/parseJwt';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginWithPassword } from '../../core/auth/authService';
import { extractApiError } from '../../core/api/errors';

const EMAIL_RX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function StoreLoginScreen() {
    const { user, loginWithTokens } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (user) {
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        if (user.role === 'store_cashier') return <Navigate to="/store" replace />;
        return <Navigate to="/client" replace />;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!EMAIL_RX.test(email)) {
            setError('Ingresa un correo electrónico válido.');
            return;
        }
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const data = await loginWithPassword(email, password);
            const accessToken = data.authentication.access_token;
            const csrfToken = data.authentication.csrf_token;

            setTokens(accessToken, csrfToken);

            const decoded = parseJwt(accessToken);
            if (!decoded) {
                setError('Error procesando la autenticación.');
                return;
            }

            loginWithTokens(accessToken, csrfToken, {
                id: decoded.sub,
                email: decoded.email,
                role: decoded.role,
            });

            navigate('/store', { replace: true });
        } catch (err: any) {
            setError(extractApiError(err, 'Credenciales incorrectas.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>Magic Club</h1>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Ingreso Sucursal</p>
            </div>

            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Acceso Cajero</h2>

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label className="input-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="input-field"
                            placeholder="caja1@magicclub.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Contraseña</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="Mínimo 8 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="input-error" style={{ marginBottom: '1rem' }}>{error}</p>}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Ingresando...' : 'Acceder'}
                    </button>
                </form>
            </div>

            <p style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                ¿Eres cliente? <a href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Ingreso Cliente</a>
            </p>
        </div>
    );
}
