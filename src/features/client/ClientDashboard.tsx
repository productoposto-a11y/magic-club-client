import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getClientProfile, getClientPurchases, getClientRewards } from '../../core/api/clientService';
import type { ClientProfileResponse, Purchase, Reward } from '../../core/types/api';
import { useSSENotifications, type SSEEventData } from '../../core/hooks/useSSENotifications';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';

const fmtPrice = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ClientDashboard() {
    const { user, logout, loggingOut } = useAuth();

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
        } else if (event.type === 'purchase_voided') {
            const amount = event.data.amount as number;
            toast.error(`Compra de ${fmtPrice(amount)} anulada`);
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
        <div className="container" style={{ paddingBottom: '2rem' }}>

            <div className="page-header">
                <h1>Magic Club</h1>
                <button onClick={logout} className="btn btn-outline" disabled={loggingOut}>
                    {loggingOut ? <><span className="spinner-inline-dark"></span>Saliendo...</> : 'Salir'}
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="tab-nav">
                    <button
                        className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purchases')}
                    >
                        Compras
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
                        Promo
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'purchases' && (
                <div className="card fade-in">
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Mis Compras</h2>
                    {purchases.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>Aún no tienes compras registradas.</p>
                    ) : (
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="hide-mobile">Pedido</th>
                                        <th>Fecha</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchases.map((p) => (
                                        <tr key={p.id}>
                                            <td className="hide-mobile" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.order_id}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{fmtPrice(p.amount)}</td>
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
                            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1rem' }}>Premios Canjeados</h3>
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                                                <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{fmtPrice(r.amount_discounted)}</td>
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
                <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h2 style={{ marginBottom: '0.5rem', width: '100%', textAlign: 'left', fontSize: '1.15rem' }}>Tu Pase Mágico</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', width: '100%', textAlign: 'left' }}>
                        Muestra este código en caja para sumar compras o canjear tus premios.
                    </p>

                    <div
                        className="qr-container"
                        style={{ cursor: 'pointer', border: '1px solid var(--color-border)', maxWidth: '100%' }}
                        onClick={() => setQrModalOpen(true)}
                    >
                        <QRCodeCanvas value={client.qr_code || ''} size={180} bgColor="#FFFFFF" fgColor="#000000" level="H" includeMargin />
                    </div>

                    <p style={{ marginTop: '1rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {(client.qr_code || '').toUpperCase()}
                    </p>

                    {client.dni && (
                        <p style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
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
                        <div className="qr-container" style={{ padding: '20px', borderRadius: '20px', maxWidth: 'calc(100vw - 4rem)' }}>
                            <QRCodeCanvas value={client.qr_code || ''} size={Math.min(280, window.innerWidth - 120)} bgColor="#FFFFFF" fgColor="#000000" level="H" includeMargin />
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
                            style={{ marginTop: '2rem', fontSize: '1.1rem', padding: '1rem 2.5rem', minWidth: '160px' }}
                            onClick={() => setQrModalOpen(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'promo' && (
                <div className="card fade-in">
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Mi Promoción</h2>

                    <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', textAlign: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '3rem', fontWeight: 800, color: reward_available ? 'var(--color-success)' : 'var(--color-primary)' }}>
                            {active_purchases_count}
                        </span>
                        <span style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)' }}>/ 5</span>
                        <p style={{ marginTop: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>compras registradas</p>
                    </div>

                    {reward_available ? (
                        <div className="alert-success">
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>¡Recompensa Desbloqueada!</h3>
                            <p style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>Tienes en promedio <strong>{fmtPrice(available_discount)}</strong> de descuento para usar en tu próxima compra presencial entregando tu código QR.</p>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                            Te faltan <strong>{5 - active_purchases_count}</strong> compras para conseguir tu próximo descuento.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
