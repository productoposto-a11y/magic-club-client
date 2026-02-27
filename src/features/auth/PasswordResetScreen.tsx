import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { requestPasswordReset, resetPassword } from '../../core/auth/authService';
import { extractApiError } from '../../core/api/errors';

const EMAIL_RX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export default function PasswordResetScreen() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    // Request reset state
    const [email, setEmail] = useState('');
    const [loadingRequest, setLoadingRequest] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState('');
    const [requestError, setRequestError] = useState('');

    // Reset password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);
    const [resetSuccess, setResetSuccess] = useState('');
    const [resetError, setResetError] = useState('');

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setRequestError('');

        if (!EMAIL_RX.test(email)) {
            setRequestError('Ingresa un correo electrónico válido.');
            return;
        }

        setLoadingRequest(true);
        try {
            await requestPasswordReset(email);
            setRequestSuccess('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
        } catch (err: any) {
            setRequestError(extractApiError(err, 'Error al enviar la solicitud.'));
        } finally {
            setLoadingRequest(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError('');

        if (newPassword.length < 8) {
            setResetError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setResetError('Las contraseñas no coinciden.');
            return;
        }

        setLoadingReset(true);
        try {
            await resetPassword(token!, newPassword);
            setResetSuccess('¡Contraseña actualizada! Ahora puedes iniciar sesión.');
        } catch (err: any) {
            setResetError(extractApiError(err, 'El enlace es inválido o ha expirado. Solicita uno nuevo.'));
        } finally {
            setLoadingReset(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>Magic Club</h1>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Recuperar contraseña</p>
            </div>

            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>

                {token ? (
                    // Step 2: Enter new password
                    <>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Nueva Contraseña</h2>

                        {resetSuccess ? (
                            <>
                                <div className="alert-success">{resetSuccess}</div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginTop: '1rem' }}
                                    onClick={() => navigate('/login', { replace: true })}
                                >
                                    Ir a Iniciar Sesión
                                </button>
                            </>
                        ) : (
                            <form onSubmit={handleResetPassword}>
                                <div className="input-group">
                                    <label className="input-label">Nueva Contraseña</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="input-field"
                                            placeholder="Mínimo 8 caracteres"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            style={{ paddingRight: '3rem' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.25rem' }}
                                        >
                                            {showPassword ? 'Ocultar' : 'Ver'}
                                        </button>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Confirmar Contraseña</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input-field"
                                        placeholder="Repetir contraseña"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                {resetError && <p className="input-error" style={{ marginBottom: '1rem' }}>{resetError}</p>}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingReset}>
                                    {loadingReset ? 'Actualizando...' : 'Cambiar Contraseña'}
                                </button>
                            </form>
                        )}
                    </>
                ) : (
                    // Step 1: Request reset link
                    <>
                        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>¿Olvidaste tu contraseña?</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                            Ingresa tu correo electrónico y te enviaremos un enlace para restablecerla.
                        </p>

                        {requestSuccess ? (
                            <div className="alert-success">{requestSuccess}</div>
                        ) : (
                            <form onSubmit={handleRequestReset}>
                                <div className="input-group">
                                    <label className="input-label">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="ejemplo@gmail.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                {requestError && <p className="input-error" style={{ marginBottom: '1rem' }}>{requestError}</p>}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingRequest}>
                                    {loadingRequest ? 'Enviando...' : 'Enviar Enlace'}
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>

            <p style={{ marginTop: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <a href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Volver al inicio de sesión</a>
            </p>
        </div>
    );
}
