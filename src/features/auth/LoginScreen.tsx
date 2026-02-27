import React, { useState } from 'react';
import { setTokens } from '../../core/api/axios';
import { useAuth } from '../../core/auth/AuthContext';
import { parseJwt } from '../../core/auth/parseJwt';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginWithDNI } from '../../core/auth/authService';
import { registerClient } from '../../core/api/clientService';
import { extractApiError } from '../../core/api/errors';

const EMAIL_RX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function LoginScreen() {
    const { user, loginWithTokens } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

    // Login state
    const [loginDni, setLoginDni] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loadingLogin, setLoadingLogin] = useState(false);
    const [errorLogin, setErrorLogin] = useState('');

    // Register state
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regDni, setRegDni] = useState('');
    const [loadingReg, setLoadingReg] = useState(false);
    const [successReg, setSuccessReg] = useState('');
    const [errorReg, setErrorReg] = useState('');

    const processAuthResponse = (data: { authentication: { access_token: string; csrf_token: string } }, redirectTo: string) => {
        const accessToken = data.authentication.access_token;
        const csrfToken = data.authentication.csrf_token;

        setTokens(accessToken, csrfToken);

        const decoded = parseJwt(accessToken);
        if (!decoded) return;

        loginWithTokens(accessToken, csrfToken, {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
        });

        navigate(redirectTo, { replace: true });
    };

    if (user) {
        if (user.role === 'admin') return <Navigate to="/admin" replace />;
        if (user.role === 'store_cashier') return <Navigate to="/store" replace />;
        return <Navigate to="/client" replace />;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorLogin('');

        if (!loginDni || !/^\d+$/.test(loginDni)) {
            setErrorLogin('Ingresa un DNI válido (solo números).');
            return;
        }
        if (loginPassword.length < 8) {
            setErrorLogin('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoadingLogin(true);

        try {
            const data = await loginWithDNI(loginDni, loginPassword);
            processAuthResponse(data, '/client');
        } catch (err: any) {
            setErrorLogin(extractApiError(err, 'Credenciales incorrectas. Verifica tu DNI y contraseña.'));
        } finally {
            setLoadingLogin(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorReg('');

        if (!EMAIL_RX.test(regEmail)) {
            setErrorReg('Ingresa un correo electrónico válido.');
            return;
        }
        if (regPassword.length < 8) {
            setErrorReg('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (!regDni || !/^\d+$/.test(regDni)) {
            setErrorReg('El DNI es obligatorio y debe contener solo números.');
            return;
        }

        setLoadingReg(true);
        setSuccessReg('');

        try {
            await registerClient(regEmail, regPassword, regDni);
            setSuccessReg('¡Cuenta creada con éxito! Ahora puedes iniciar sesión con tu DNI.');
            setLoginDni(regDni);
            setTimeout(() => setActiveTab('login'), 2000);
        } catch (err: any) {
            setErrorReg(extractApiError(err, 'Error al crear la cuenta.'));
        } finally {
            setLoadingReg(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>Magic Club</h1>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>El programa de lealtad oficial</p>
            </div>

            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>

                <div className="tab-nav">
                    <button
                        onClick={() => setActiveTab('login')}
                        className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                    >
                        Ingreso
                    </button>
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                    >
                        Registro
                    </button>
                </div>

                {activeTab === 'login' ? (
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label className="input-label">Tu DNI</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ej. 35123456"
                                value={loginDni}
                                onChange={(e) => setLoginDni(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Tu Contraseña</label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="Mínimo 8 caracteres"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                            />
                        </div>

                        {errorLogin && <p className="input-error" style={{ marginBottom: '1rem' }}>{errorLogin}</p>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingLogin}>
                            {loadingLogin ? 'Ingresando...' : 'Iniciar Sesión'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        {successReg && <div className="alert-success">{successReg}</div>}

                        <div className="input-group">
                            <label className="input-label">Correo Electrónico</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="ejemplo@gmail.com"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Contraseña</label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="Mínimo 8 caracteres"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">DNI</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ej. 35123456"
                                value={regDni}
                                onChange={(e) => setRegDni(e.target.value)}
                                required
                            />
                        </div>

                        {errorReg && <p className="input-error" style={{ marginBottom: '1rem' }}>{errorReg}</p>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingReg}>
                            {loadingReg ? 'Creando...' : 'Crear Cuenta'}
                        </button>
                    </form>
                )}
            </div>

            <p style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                ¿Eres cajero? <a href="/login/sucursal" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Ingreso Sucursal</a>
            </p>
        </div>
    );
}
