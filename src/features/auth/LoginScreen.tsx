import React, { useState } from 'react';
import { setTokens } from '../../core/api/axios';
import { useAuth } from '../../core/auth/AuthContext';
import { parseJwt } from '../../core/auth/parseJwt';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginWithDNI } from '../../core/auth/authService';
import { registerClient } from '../../core/api/clientService';
import { extractApiError } from '../../core/api/errors';

const EMAIL_RX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateCUIL(raw: string): boolean {
    const cuil = raw.replace(/-/g, '');
    if (!/^\d{11}$/.test(cuil)) return false;
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cuil[i]) * multipliers[i];
    const remainder = sum % 11;
    const expected = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
    return parseInt(cuil[10]) === expected;
}

function formatCUIL(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return digits.slice(0, 2) + '-' + digits.slice(2);
    return digits.slice(0, 2) + '-' + digits.slice(2, 10) + '-' + digits.slice(10);
}

export default function LoginScreen() {
    const { user, loginWithTokens } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

    // Login state
    const [loginDni, setLoginDni] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [loadingLogin, setLoadingLogin] = useState(false);
    const [errorLogin, setErrorLogin] = useState('');

    // Register state
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [regDni, setRegDni] = useState('');
    const [regBirthday, setRegBirthday] = useState('');
    const [regReferral, setRegReferral] = useState('');
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

        const cleanCuil = loginDni.replace(/-/g, '');
        if (!cleanCuil || !/^\d{11}$/.test(cleanCuil)) {
            setErrorLogin('Ingresá un CUIL válido de 11 dígitos.');
            return;
        }
        if (!validateCUIL(cleanCuil)) {
            setErrorLogin('El CUIL ingresado no es válido. Verificá los números.');
            return;
        }
        if (loginPassword.length < 8) {
            setErrorLogin('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoadingLogin(true);

        try {
            const data = await loginWithDNI(cleanCuil, loginPassword);
            processAuthResponse(data, '/client');
        } catch (err: any) {
            setErrorLogin(extractApiError(err, 'Credenciales incorrectas. Verificá tu CUIL y contraseña.'));
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
        if (regPassword !== regConfirmPassword) {
            setErrorReg('Las contraseñas no coinciden.');
            return;
        }
        const cleanCuil = regDni.replace(/-/g, '');
        if (!cleanCuil || !/^\d{11}$/.test(cleanCuil)) {
            setErrorReg('El CUIL es obligatorio y debe tener 11 dígitos.');
            return;
        }
        if (!validateCUIL(cleanCuil)) {
            setErrorReg('El CUIL ingresado no es válido. Verificá los números.');
            return;
        }

        setLoadingReg(true);
        setSuccessReg('');

        try {
            await registerClient(regEmail, regPassword, cleanCuil, regBirthday || undefined, regReferral || undefined);
            setSuccessReg('¡Cuenta creada con éxito! Ahora podés iniciar sesión con tu CUIL.');
            setLoginDni(formatCUIL(cleanCuil));
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
                            <label className="input-label">Tu CUIL</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ej. 20-35123456-9"
                                value={loginDni}
                                onChange={(e) => setLoginDni(formatCUIL(e.target.value))}
                                inputMode="numeric"
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Tu Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showLoginPassword ? 'text' : 'password'}
                                    className="input-field"
                                    placeholder="Mínimo 8 caracteres"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '3rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.25rem' }}
                                >
                                    {showLoginPassword ? 'Ocultar' : 'Ver'}
                                </button>
                            </div>
                        </div>

                        {errorLogin && <p className="input-error" style={{ marginBottom: '1rem' }}>{errorLogin}</p>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingLogin}>
                            {loadingLogin ? 'Ingresando...' : 'Iniciar Sesión'}
                        </button>

                        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <a href="/recuperar" style={{ color: 'var(--color-primary)', fontSize: '0.85rem', textDecoration: 'underline' }}>¿Olvidaste tu contraseña?</a>
                        </p>
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
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showRegPassword ? 'text' : 'password'}
                                    className="input-field"
                                    placeholder="Mínimo 8 caracteres"
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '3rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowRegPassword(!showRegPassword)}
                                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.25rem' }}
                                >
                                    {showRegPassword ? 'Ocultar' : 'Ver'}
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Confirmar Contraseña</label>
                            <input
                                type={showRegPassword ? 'text' : 'password'}
                                className="input-field"
                                placeholder="Repetir contraseña"
                                value={regConfirmPassword}
                                onChange={(e) => setRegConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">CUIL</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ej. 20-35123456-9"
                                value={regDni}
                                onChange={(e) => setRegDni(formatCUIL(e.target.value))}
                                inputMode="numeric"
                                required
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                Podés consultarlo en <a href="https://www.anses.gob.ar/consulta/constancia-de-cuil" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)' }}>ANSES</a>
                            </p>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Fecha de Nacimiento <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                            <input
                                type="date"
                                className="input-field"
                                value={regBirthday}
                                onChange={(e) => setRegBirthday(e.target.value)}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Código de Referido <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ej. A3F7K2"
                                value={regReferral}
                                onChange={(e) => setRegReferral(e.target.value.toUpperCase().slice(0, 6))}
                                maxLength={6}
                                style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
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
