import { useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { apiClient } from '../../core/api/axios';
import QRCode from 'react-qr-code';

export default function ClientDashboard() {
    const { user, logout } = useAuth();

    const [clientData, setClientData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.email) return;
            try {
                const res = await apiClient.get(`/clients/${user.email}`);
                setClientData(res.data);
            } catch (err: any) {
                setError('No pudimos cargar tu perfil.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    if (loading) {
        return (
            <div className="loader-container">
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem' }}>Cargando tu progreso...</p>
            </div>
        );
    }

    if (error || !clientData) {
        return (
            <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}>
                <h2 style={{ color: 'var(--color-danger)' }}>{error}</h2>
            </div>
        );
    }

    const { client, status } = clientData;
    const { active_purchases_count, reward_available, available_discount } = status;

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>Magic Club</h1>
                <button onClick={logout} className="btn" style={{ border: '1px solid var(--color-border)' }}>Salir</button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

                {/* Progress Card */}
                <div className="card" style={{ flex: '1 1 300px' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Tu Progreso</h2>

                    <div style={{ padding: '2rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '4rem', fontWeight: 800, color: reward_available ? 'var(--color-success)' : 'var(--color-primary)' }}>
                            {active_purchases_count}
                        </span>
                        <span style={{ fontSize: '2rem', color: 'var(--color-text-muted)' }}>/ 5</span>
                        <p style={{ marginTop: '0.5rem', fontWeight: 500 }}>compras registradas</p>
                    </div>

                    {reward_available ? (
                        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>¡Recompensa Desbloqueada!</h3>
                            <p>Tienes en promedio <strong>${available_discount.toFixed(2)}</strong> de descuento para usar en tu próxima compra presencial entregando tu código QR.</p>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                            Te faltan {5 - active_purchases_count} compras para conseguir tu próximo descuento.
                        </p>
                    )}
                </div>

                {/* QR Code Card */}
                <div className="card" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h2 style={{ marginBottom: '0.5rem', width: '100%', textAlign: 'left' }}>Tu Pase Mágico</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '2rem', width: '100%', textAlign: 'left' }}>
                        Muestra este código en caja para sumar compras o canjear tus premios.
                    </p>

                    <div style={{ padding: '1rem', backgroundColor: 'white', border: '1px solid var(--color-border)', borderRadius: '16px' }}>
                        <QRCode value={client.qr_code} size={200} />
                    </div>

                    <p style={{ marginTop: '1.5rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--color-text-muted)' }}>
                        {client.qr_code.toUpperCase()}
                    </p>
                </div>

            </div>
        </div>
    );
}
