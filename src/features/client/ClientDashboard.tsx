import { useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getClientProfile, getClientPurchases, getClientRewards } from '../../core/api/clientService';
import type { ClientProfileResponse, Purchase, Reward } from '../../core/types/api';
import QRCode from 'react-qr-code';

export default function ClientDashboard() {
    const { user, logout } = useAuth();

    const [clientData, setClientData] = useState<ClientProfileResponse | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeHistoryTab, setActiveHistoryTab] = useState<'purchases' | 'rewards'>('purchases');

    useEffect(() => {
        let isMounted = true;

        const fetchProfile = async () => {
            if (!user?.email) return;
            try {
                const [profile, purchaseList, rewardList] = await Promise.all([
                    getClientProfile(user.email),
                    getClientPurchases(user.email),
                    getClientRewards(user.email),
                ]);
                if (isMounted) {
                    setClientData(profile);
                    setPurchases(purchaseList);
                    setRewards(rewardList);
                }
            } catch {
                if (isMounted) setError('No pudimos cargar tu perfil.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchProfile();

        return () => { isMounted = false; };
    }, [user?.email]);

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

            <div className="page-header">
                <h1>Magic Club</h1>
                <button onClick={logout} className="btn btn-outline">Salir</button>
            </div>

            <div className="flex-cards">

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
                        <div className="alert-success">
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
                        <QRCode value={client.qr_code || ''} size={200} />
                    </div>

                    <p style={{ marginTop: '1.5rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--color-text-muted)' }}>
                        {(client.qr_code || '').toUpperCase()}
                    </p>
                </div>

            </div>

            {/* Purchase & Reward History */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <div className="tab-nav">
                    <button
                        className={`tab-btn ${activeHistoryTab === 'purchases' ? 'active' : ''}`}
                        onClick={() => setActiveHistoryTab('purchases')}
                    >
                        Compras ({purchases.length})
                    </button>
                    <button
                        className={`tab-btn ${activeHistoryTab === 'rewards' ? 'active' : ''}`}
                        onClick={() => setActiveHistoryTab('rewards')}
                    >
                        Premios ({rewards.length})
                    </button>
                </div>

                {activeHistoryTab === 'purchases' ? (
                    purchases.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>Aún no tienes compras registradas.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((p) => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td>${p.amount.toFixed(2)}</td>
                                            <td>
                                                <span className={`badge ${p.status === 'active' ? 'badge-active' : 'badge-used'}`}>
                                                    {p.status === 'active' ? 'Activa' : 'Usada'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    rewards.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>Aún no has canjeado premios.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Descuento</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rewards.map((r) => (
                                        <tr key={r.id}>
                                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                            <td>${r.amount_discounted.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
