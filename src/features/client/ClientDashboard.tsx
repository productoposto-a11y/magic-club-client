import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getClientProfile, getClientPurchases, getClientRewards } from '../../core/api/clientService';
import type { ClientProfileResponse, Purchase, Reward } from '../../core/types/api';
import { useSSENotifications, type SSEEventData } from '../../core/hooks/useSSENotifications';
import { toast } from 'sonner';
import QRCode from 'react-qr-code';

const fmtPrice = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ClientDashboard() {
    const { user, logout } = useAuth();

    const [clientData, setClientData] = useState<ClientProfileResponse | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'purchases' | 'qr' | 'promo'>('purchases');
    const [qrModalOpen, setQrModalOpen] = useState(false);

    const fetchAllData = useCallback(async () => {
        if (!user?.email) return;
        try {
            const [profile, purchaseList, rewardList] = await Promise.all([
                getClientProfile(user.email),
                getClientPurchases(user.email),
                getClientRewards(user.email),
            ]);
            setClientData(profile);
            setPurchases(purchaseList);
            setRewards(rewardList);
        } catch {
            // Silently fail on refresh
        }
    }, [user?.email]);

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

    const handleSSEEvent = useCallback((event: SSEEventData) => {
        if (event.type === 'purchase_registered') {
            const amount = event.data.amount as number;
            toast.info(`Compra de ${fmtPrice(amount)} registrada`);
        } else if (event.type === 'reward_redeemed') {
            const amount = event.data.amount_discounted as number;
            toast.success(`Premio canjeado: ${fmtPrice(amount)} de descuento`);
        }
        fetchAllData();
    }, [fetchAllData]);

    useSSENotifications({
        onEvent: handleSSEEvent,
        enabled: !loading && user?.role === 'client',
    });

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

            {/* Tab Navigation */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="tab-nav">
                    <button
                        className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purchases')}
                    >
                        Mis Compras
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'qr' ? 'active' : ''}`}
                        onClick={() => setActiveTab('qr')}
                    >
                        Mi QR
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'promo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('promo')}
                    >
                        Mi Promoción
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'purchases' && (
                <div className="card">
                    <h2 style={{ marginBottom: '1.5rem' }}>Mis Compras</h2>
                    {purchases.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>Aún no tienes compras registradas.</p>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Pedido</th>
                                        <th>Fecha</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((p) => (
                                        <tr key={p.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.order_id}</td>
                                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td>{fmtPrice(p.amount)}</td>
                                            <td>
                                                <span className={`badge ${p.status === 'active' ? 'badge-active' : p.status === 'voided' ? 'badge-voided' : 'badge-used'}`}>
                                                    {p.status === 'active' ? 'Activa' : p.status === 'voided' ? 'Anulada' : 'Usada'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {rewards.length > 0 && (
                        <>
                            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Premios Canjeados</h3>
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
                                                <td>{fmtPrice(r.amount_discounted)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'qr' && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h2 style={{ marginBottom: '0.5rem', width: '100%', textAlign: 'left' }}>Tu Pase Mágico</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '2rem', width: '100%', textAlign: 'left' }}>
                        Muestra este código en caja para sumar compras o canjear tus premios.
                    </p>

                    <div
                        className="qr-container"
                        style={{ cursor: 'pointer', border: '1px solid var(--color-border)' }}
                        onClick={() => setQrModalOpen(true)}
                    >
                        <QRCode value={client.qr_code || ''} size={180} bgColor="#FFFFFF" fgColor="#000000" level="H" />
                    </div>

                    <p style={{ marginTop: '1.5rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        {(client.qr_code || '').toUpperCase()}
                    </p>

                    {client.dni && (
                        <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            DNI: {client.dni}
                        </p>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '1.5rem', width: '100%' }}
                        onClick={() => setQrModalOpen(true)}
                    >
                        Abrir QR en pantalla completa
                    </button>
                </div>
            )}

            {/* QR Fullscreen Modal */}
            {qrModalOpen && (
                <div className="qr-fullscreen-overlay" onClick={() => setQrModalOpen(false)}>
                    <div className="qr-fullscreen-content" onClick={(e) => e.stopPropagation()}>
                        <div className="qr-container" style={{ padding: '24px', borderRadius: '20px' }}>
                            <QRCode value={client.qr_code || ''} size={280} bgColor="#FFFFFF" fgColor="#000000" level="H" />
                        </div>
                        <p style={{ marginTop: '1.5rem', fontWeight: 700, letterSpacing: '3px', fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                            {(client.qr_code || '').toUpperCase()}
                        </p>
                        {client.dni && (
                            <p style={{ marginTop: '0.5rem', fontSize: '1rem', color: 'var(--color-text-muted)' }}>
                                DNI: {client.dni}
                            </p>
                        )}
                        <button
                            className="btn btn-outline"
                            style={{ marginTop: '2rem', fontSize: '1.1rem', padding: '0.85rem 2.5rem' }}
                            onClick={() => setQrModalOpen(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'promo' && (
                <div className="card">
                    <h2 style={{ marginBottom: '1.5rem' }}>Mi Promoción</h2>

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
                            <p>Tienes en promedio <strong>{fmtPrice(available_discount)}</strong> de descuento para usar en tu próxima compra presencial entregando tu código QR.</p>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', textAlign: 'center' }}>
                            Te faltan <strong>{5 - active_purchases_count}</strong> compras para conseguir tu próximo descuento.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
