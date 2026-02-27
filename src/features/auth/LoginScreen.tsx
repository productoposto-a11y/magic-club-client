import React, { useState } from 'react';
import { setTokens } from '../../core/api/axios';
import { useAuth } from '../../core/auth/AuthContext';
import { parseJwt } from '../../core/auth/parseJwt';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginWithPassword as apiLoginWithPassword } from '../../core/auth/authService';
import { requestMagicLink } from '../../core/auth/authService';
import { registerClient } from '../../core/api/clientService';
import { extractApiError } from '../../core/api/errors';

const EMAIL_RX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function LoginScreen() {
    const { user, loginWithTokens } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

    const [emailMagic, setEmailMagic] = useState('');
    const [loadingMagic, setLoadingMagic] = useState(false);
    const [successMagic, setSuccessMagic] = useState(false);
    const [errorMagic, setErrorMagic] = useState('');

    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regDni, setRegDni] = useState('');
    const [loadingReg, setLoadingReg] = useState(false);
    const [successReg, setSuccessReg] = useState('');
    const [errorReg, setErrorReg] = useState('');

    const [loginWithPasswordToggle, setLoginWithPasswordToggle] = useState(false);
    const [clientPassword, setClientPassword] = useState('');

    const [emailPass, setEmailPass] = useState('');
    const [password, setPassword] = useState('');
    const [loadingPass, setLoadingPass] = useState(false);
    const [errorPass, setErrorPass] = useState('');

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

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMagic('');

        if (!EMAIL_RX.test(emailMagic)) {
            setErrorMagic('Ingresa un correo electrónico válido.');
            return;
        }
        if (loginWithPasswordToggle && clientPassword.length < 8) {
            setErrorMagic('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoadingMagic(true);
        setSuccessMagic(false);

        try {
            if (loginWithPasswordToggle) {
                const data = await apiLoginWithPassword(emailMagic, clientPassword);
                processAuthResponse(data, '/client');
            } else {
                await requestMagicLink(emailMagic);
                setSuccessMagic(true);
            }
        } catch (err: any) {
            setErrorMagic(extractApiError(err, 'Error en la autenticación. Verifica tus datos.'));
        } finally {
            setLoadingMagic(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorReg('');

        if (!EMAIL_RX.test(regEmail)) {
            setErrorReg('Ingresa un correo electrónico válido.');
            return;
        }
        if (regPassword && regPassword.length < 8) {
            setErrorReg('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (regDni && !/^\d+$/.test(regDni)) {
            setErrorReg('El DNI debe contener solo números.');
            return;
        }

        setLoadingReg(true);
        setSuccessReg('');

        try {
            await registerClient(regEmail, regPassword, regDni);
            setSuccessReg('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
            setEmailMagic(regEmail);
            if (regPassword) setLoginWithPasswordToggle(true);
            setTimeout(() => setActiveTab('login'), 2000);
        } catch (err: any) {
            setErrorReg(extractApiError(err, 'Error al crear la cuenta.'));
        } finally {
            setLoadingReg(false);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorPass('');

        if (!EMAIL_RX.test(emailPass)) {
            setErrorPass('Ingresa un correo electrónico válido.');
            return;
        }
        if (password.length < 8) {
            setErrorPass('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setLoadingPass(true);

        try {
            const data = await apiLoginWithPassword(emailPass, password);
            processAuthResponse(data, '/store');
        } catch (err: any) {
            setErrorPass(extractApiError(err, 'Credenciales incorrectas'));
        } finally {
            setLoadingPass(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>Magic Club</h1>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>El programa de lealtad oficial</p>
            </div>

            <div className="flex-cards" style={{ justifyContent: 'center', width: '100%' }}>

                {/* Magic Link / Register (Clients) */}
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
                        successMagic ? (
                            <div className="alert-success">
                                <strong>¡Enlace enviado!</strong> Revisa tu correo electrónico para iniciar sesión de forma segura.
                            </div>
                        ) : (
                            <form onSubmit={handleMagicLink}>
                                <div className="input-group">
                                    <label className="input-label">Tu Correo Electrónico</label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="ejemplo@gmail.com"
                                        value={emailMagic}
                                        onChange={(e) => setEmailMagic(e.target.value)}
                                        required
                                    />
                                </div>

                                {loginWithPasswordToggle && (
                                    <div className="input-group">
                                        <label className="input-label">Tu Contraseña</label>
                                        <input
                                            type="password"
                                            className="input-field"
                                            placeholder="Mínimo 8 caracteres"
                                            value={clientPassword}
                                            onChange={(e) => setClientPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                {errorMagic && <p className="input-error" style={{ marginBottom: '1rem' }}>{errorMagic}</p>}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingMagic}>
                                    {loadingMagic ? 'Procesando...' : (loginWithPasswordToggle ? 'Iniciar Sesión' : 'Recibir Enlace Mágico')}
                                </button>

                                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setLoginWithPasswordToggle(!loginWithPasswordToggle)}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
                                    >
                                        {loginWithPasswordToggle ? 'Prefiero usar Enlace Mágico' : 'Prefiero usar mi contraseña'}
                                    </button>
                                </div>
                            </form>
                        )
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
                                <label className="input-label">Contraseña (Opcional)</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="Mínimo 8 caracteres"
                                    value={regPassword}
                                    onChange={(e) => setRegPassword(e.target.value)}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">DNI (Opcional)</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Para que te busquen en caja"
                                    value={regDni}
                                    onChange={(e) => setRegDni(e.target.value)}
                                />
                            </div>

                            {errorReg && <p className="input-error" style={{ marginBottom: '1rem' }}>{errorReg}</p>}

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingReg}>
                                {loadingReg ? 'Creando...' : 'Crear Cuenta'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Password Login (Staff) */}
                <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Ingreso Sucursal</h2>

                    <form onSubmit={handlePasswordLogin}>
                        <div className="input-group">
                            <label className="input-label">Correo Electrónico</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="caja1@magicclub.com"
                                value={emailPass}
                                onChange={(e) => setEmailPass(e.target.value)}
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

                        {errorPass && <p className="input-error" style={{ marginBottom: '1rem' }}>{errorPass}</p>}

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', backgroundColor: 'var(--color-text)' }} disabled={loadingPass}>
                            {loadingPass ? 'Iniciando...' : 'Acceder (Password)'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
