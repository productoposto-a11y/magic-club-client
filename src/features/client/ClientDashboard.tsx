import { lazy, Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getClientProfile, getClientPurchases, getClientRewards, getMyComments, createComment, getAllComments } from '../../core/api/clientService';
import type { ClientProfileResponse, Purchase, Reward, Comment, CommentWithEmail } from '../../core/types/api';
import { useSSENotifications, type SSEEventData } from '../../core/hooks/useSSENotifications';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import TabNav from '../../components/TabNav';
import type { StoreLocation } from '../../components/StoresMap';

// Lazy-load the heavy Leaflet map (only when Locales tab is opened)
const StoresMap = lazy(() => import('../../components/StoresMap'));

const STORES: StoreLocation[] = [
    { name: 'CABA - Florida', address: 'Florida 650', city: 'CABA, Buenos Aires', hours: 'Lunes a Sábados de 9 a 20hs', phone: '11 2180-5885', webChanges: true, coords: [-34.5995, -58.3745] },
    { name: 'CABA - Lavalle', address: 'Lavalle 735', city: 'CABA, Buenos Aires', hours: 'Lunes a Sábados de 9 a 20hs', phone: '11 2654-8558', webChanges: true, coords: [-34.6020, -58.3770] },
    { name: 'CABA - Shopping Abasto', address: 'Av. Corrientes 3247', city: 'CABA, Buenos Aires', hours: 'Todos los días de 10 a 22hs', webChanges: false, coords: [-34.6036, -58.4115] },
    { name: 'CABA - Shopping Devoto', address: 'Quevedo 3365', city: 'CABA, Buenos Aires', hours: 'Do/Ju y feriados 10 a 21h. Vi Sa y vísperas de fer.', phone: '11 5802-6481', webChanges: false, coords: [-34.5983, -58.5136] },
    { name: 'CABA - Villa Urquiza', address: 'Av. Triunvirato 4223', city: 'CABA, Buenos Aires', hours: 'PRÓXIMAMENTE', webChanges: false, coords: [-34.5730, -58.4890], tag: 'Próximamente' },
    { name: 'GBA - Nine Shopping', address: 'Av. Victorica 1128', city: 'Moreno, Buenos Aires', hours: 'Todos los días 10h a 22h', phone: '11 2676-7046', webChanges: false, coords: [-34.6502, -58.7918] },
    { name: 'GBA - Shopping Parque Avellaneda', address: 'Salida Acceso Sudeste', city: 'Sarandí, Buenos Aires', hours: 'Todos los días de 10 a 22hs', webChanges: false, coords: [-34.6780, -58.3400] },
    { name: 'GBA - Shopping Soleil Premium Outlet', address: 'Av. Bernardo de Irigoyen 2678', city: 'Boulogne, Buenos Aires', hours: 'Todos los días de 10 a 22hs', phone: '11 2722-3787', webChanges: false, coords: [-34.5095, -58.5590] },
    { name: 'GBA - Shopping Tortugas Open Mall', address: 'Ramal Pilar Km 36.5', city: 'Tortuguitas, Buenos Aires', hours: 'Todos los días de 10 a 22hs', phone: '11 2294-4038', webChanges: true, coords: [-34.4580, -58.7410] },
    { name: 'INTERIOR - Caleta Olivia', address: 'San Martín 65', city: 'Caleta Olivia, Santa Cruz', hours: '', phone: '2974 00-3920', webChanges: false, coords: [-46.4396, -67.5165] },
    { name: 'INTERIOR - Río Grande', address: 'Av. San Martín 670', city: 'Río Grande, Tierra del Fuego', hours: 'Lu/Sa de 10 a 13h y 15:30 a 20:30h', phone: '2964 35-1799', webChanges: false, coords: [-53.7877, -67.7094] },
    { name: 'INTERIOR - San Luis Shopping', address: 'Av. Juan Gilberto Funes 260', city: 'San Luis', hours: 'Todos los días de 10 a 20hs', phone: '266 424-3636', webChanges: false, coords: [-33.3017, -66.3378] },
    { name: 'INTERIOR - Shopping Annuar', address: 'Gral. Belgrano 563', city: 'Jujuy', hours: 'Todos los días de 10 a 20hs', phone: '3884 79-7458', webChanges: false, coords: [-24.1858, -65.2995] },
    { name: 'INTERIOR - Shopping Patagonia', address: 'Onelli 447', city: 'Bariloche, Río Negro', hours: 'Todos los días de 10 a 22hs', phone: '2944 70-3613', webChanges: false, coords: [-41.1335, -71.3103] },
    { name: 'INTERIOR - Shopping Portal Rosario', address: 'Nansen 323', city: 'Rosario, Santa Fe', hours: 'Todos los días de 11 a 21hs', phone: '3417 40-9610', webChanges: false, coords: [-32.9174, -60.6938] },
    { name: 'Mayorista - Flores', address: 'Aranguren 2999', city: 'CABA, Buenos Aires', hours: 'Lu/Vi 7:30 a 17:30h. Sa 7:30 a 14:30h', phone: '11 3286-0432', webChanges: false, coords: [-34.6290, -58.4670], tag: 'Mayorista' },
];

const fmtPrice = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ClientDashboard() {
    const { user, logout, loggingOut } = useAuth();

    const [clientData, setClientData] = useState<ClientProfileResponse | null>(null);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'purchases' | 'qr' | 'promo' | 'locales' | 'comments'>('purchases');
    const [qrModalOpen, setQrModalOpen] = useState(false);

    // Comments
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentStore, setCommentStore] = useState('');
    const [commentBody, setCommentBody] = useState('');
    const [commentRating, setCommentRating] = useState(5);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [commentSubTab, setCommentSubTab] = useState<'all' | 'mine' | 'new'>('all');
    const [allComments, setAllComments] = useState<CommentWithEmail[]>([]);
    const [allCommentsTotal, setAllCommentsTotal] = useState(0);
    const [allCommentsPage, setAllCommentsPage] = useState(1);
    const [loadingAllComments, setLoadingAllComments] = useState(false);

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

    useEffect(() => {
        if (activeTab === 'comments' && commentSubTab === 'mine' && comments.length === 0) {
            setLoadingComments(true);
            getMyComments().then(setComments).catch(() => {}).finally(() => setLoadingComments(false));
        }
    }, [activeTab, commentSubTab]);

    useEffect(() => {
        if (activeTab === 'comments' && commentSubTab === 'all') {
            setLoadingAllComments(true);
            getAllComments(allCommentsPage)
                .then(data => { setAllComments(data.comments || []); setAllCommentsTotal(data.metadata.total_records); })
                .catch(() => {})
                .finally(() => setLoadingAllComments(false));
        }
    }, [activeTab, commentSubTab, allCommentsPage]);

    const handleSubmitComment = async () => {
        if (!commentStore || !commentBody.trim()) {
            toast.error('Seleccioná una sucursal y escribí tu comentario.');
            return;
        }
        setSubmittingComment(true);
        try {
            const newComment = await createComment(commentStore, commentBody.trim(), commentRating);
            setComments(prev => [newComment, ...prev]);
            setCommentBody('');
            setCommentRating(5);
            setCommentStore('');
            toast.success('Comentario enviado');
        } catch {
            toast.error('Error al enviar el comentario.');
        } finally {
            setSubmittingComment(false);
        }
    };

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

    const totalSaved = useMemo(() => rewards.reduce((acc, r) => acc + r.amount_discounted, 0), [rewards]);

    const tabs = useMemo(() => [
        { key: 'purchases', label: 'Compras' },
        { key: 'qr', label: 'Mi QR' },
        { key: 'promo', label: 'Promo' },
        { key: 'locales', label: 'Locales' },
        { key: 'comments', label: 'Opiniones' },
    ], []);

    if (loading) {
        return (
            <div className="container" style={{ paddingBottom: '2rem' }}>
                <div className="page-header">
                    <div className="skeleton skeleton-heading" style={{ width: '140px' }}></div>
                    <div className="skeleton skeleton-btn" style={{ width: '70px' }}></div>
                </div>
                <div className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div className="skeleton" style={{ flex: 1, height: '44px' }}></div>
                        <div className="skeleton" style={{ flex: 1, height: '44px' }}></div>
                        <div className="skeleton" style={{ flex: 1, height: '44px' }}></div>
                    </div>
                </div>
                <div className="card">
                    <div className="skeleton skeleton-heading" style={{ width: '45%' }}></div>
                    {[1,2,3,4].map(i => (
                        <div key={i} className="skeleton-row">
                            <div className="skeleton skeleton-text" style={{ flex: 2 }}></div>
                            <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
                            <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !clientData) {
        logout();
        window.location.href = '/';
        return null;
    }

    const { client, status } = clientData;
    const { active_purchases_count, reward_available, available_discount } = status;

    const getDaysRemaining = (p: Purchase): number | null => {
        const created = new Date(p.created_at);
        const expires = new Date(created.getTime() + 90 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 0;
    };

    const copyReferralCode = () => {
        if (client.referral_code) {
            navigator.clipboard.writeText(client.referral_code);
            toast.success('Código copiado al portapapeles');
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '2rem' }}>

            <div className="page-header">
                <h1>Magic Club</h1>
                <button onClick={logout} className="btn btn-outline" disabled={loggingOut}>
                    {loggingOut ? <><span className="spinner-inline-dark"></span>Saliendo...</> : 'Salir'}
                </button>
            </div>

            {/* Tab Navigation */}
            <TabNav
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(key) => setActiveTab(key as typeof activeTab)}
            />

            {/* Tab Content */}
            {activeTab === 'purchases' && (
                <div className="fade-in">
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div className="stat-card">
                            <p className="stat-label">Compras Activas</p>
                            <p className="stat-value" style={{ color: 'var(--color-primary)' }}>{active_purchases_count} / 5</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">Total Compras</p>
                            <p className="stat-value" style={{ color: 'var(--color-text)' }}>{purchases.length}</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">Premios Canjeados</p>
                            <p className="stat-value" style={{ color: 'var(--color-success)' }}>{rewards.length}</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">Total Ahorrado</p>
                            <p className="stat-value" style={{ color: 'var(--color-secondary)' }}>{fmtPrice(totalSaved)}</p>
                        </div>
                    </div>

                    <div className="card">
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
                                        {purchases.map((p) => {
                                            const daysLeft = p.status === 'active' ? getDaysRemaining(p) : null;
                                            return (
                                                <tr key={p.id}>
                                                    <td className="hide-mobile" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.order_id}</td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtPrice(p.amount)}</td>
                                                    <td>
                                                        <span className={`badge ${p.status === 'active' ? 'badge-active' : p.status === 'voided' ? 'badge-voided' : 'badge-used'}`}>
                                                            {p.status === 'active' ? 'Activa' : p.status === 'voided' ? 'Anulada' : 'Usada'}
                                                        </span>
                                                        {daysLeft !== null && (
                                                            <span style={{ display: 'block', fontSize: '0.65rem', color: daysLeft <= 15 ? '#dc2626' : 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                                                {daysLeft === 0 ? 'Vence hoy' : `Vence en ${daysLeft}d`}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
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
                        <QRCodeCanvas value={client.dni || ''} size={180} bgColor="#FFFFFF" fgColor="#000000" level="L" includeMargin />
                    </div>

                    {client.dni && (
                        <p style={{ marginTop: '1rem', fontWeight: 600, letterSpacing: '2px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
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

                    {/* Profile Info */}
                    <div style={{ width: '100%', marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-text-muted)' }}>Email</span>
                                <span style={{ fontWeight: 500 }}>{client.email}</span>
                            </div>
                            {client.birthday && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Cumpleaños</span>
                                    <span style={{ fontWeight: 500 }}>{new Date(client.birthday + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                                </div>
                            )}
                            {client.referral_code && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Tu código de referido</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, letterSpacing: '2px', fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--color-primary)' }}>{client.referral_code}</span>
                                        <button
                                            type="button"
                                            onClick={copyReferralCode}
                                            className="btn btn-outline"
                                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', minHeight: 'unset' }}
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>
                            )}
                            {client.referred_by && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>Referido por</span>
                                    <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{client.referred_by}</span>
                                </div>
                            )}
                        </div>

                        {client.referral_code && (
                            <button
                                className="btn btn-outline"
                                style={{ width: '100%', marginTop: '1rem', fontSize: '0.85rem' }}
                                onClick={() => {
                                    const text = `Unite a Magic Club con mi código ${client.referral_code} y empezá a ganar premios.`;
                                    if (navigator.share) {
                                        navigator.share({ title: 'Magic Club', text });
                                    } else {
                                        navigator.clipboard.writeText(text);
                                        toast.success('Texto copiado para compartir');
                                    }
                                }}
                            >
                                Compartir mi código
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* QR Fullscreen Modal */}
            {qrModalOpen && (
                <div className="qr-fullscreen-overlay" style={{ backgroundColor: '#f8fafc' }} onClick={() => setQrModalOpen(false)}>
                    <div className="qr-fullscreen-content" onClick={(e) => e.stopPropagation()}>

                        <p style={{ color: 'var(--color-primary)', fontSize: 'clamp(1rem, 4vw, 1.25rem)', fontWeight: 700, marginBottom: '0.25rem', letterSpacing: '0.02em' }}>Tu Pase Mágico</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>Mostrá este QR en caja</p>

                        <div style={{ padding: '24px', borderRadius: '16px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                            <QRCodeCanvas value={client.dni || ''} size={Math.min(260, window.innerWidth - 140)} bgColor="#FFFFFF" fgColor="#000000" level="L" includeMargin />
                        </div>

                        {client.dni && (
                            <p style={{ marginTop: '1.25rem', fontWeight: 600, letterSpacing: '3px', fontSize: '1rem', color: '#0f172a' }}>
                                DNI: {client.dni}
                            </p>
                        )}

                        <button
                            className="btn btn-outline"
                            style={{ marginTop: '2.5rem', fontSize: '1rem', padding: '0.85rem 2.5rem', borderRadius: '50px', minWidth: '160px' }}
                            onClick={() => setQrModalOpen(false)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'promo' && (
                <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="mc-tarjeta">
                        <img
                            src="https://magicstore.com.ar/wp-content/uploads/2026/02/logo_club-scaled.png"
                            alt="Magic Club"
                            className="mc-logo-img"
                        />

                        <div className="mc-subtitulo">
                            {reward_available
                                ? '¡Felicidades! Tu próxima compra es GRATIS*'
                                : '¡Gracias por ser nuestro cliente!'}
                        </div>

                        <div className="mc-estrellas-contenedor">
                            {[1, 2, 3, 4, 5].map((i) => {
                                const filled = i <= active_purchases_count;
                                const isWinner = i === 5 && active_purchases_count >= 5;

                                const imgSrc = isWinner
                                    ? 'https://magicstore.com.ar/wp-content/uploads/2026/02/estrella-ganadora.png'
                                    : filled
                                        ? 'https://magicstore.com.ar/wp-content/uploads/2026/02/pngtree-silver-star-badge-png-image_9232942.png'
                                        : 'https://magicstore.com.ar/wp-content/uploads/2026/02/Gemini_Generated_Image_sinafrsinafrsina-02.png';

                                return (
                                    <div key={i} className="mc-estrella-wrapper">
                                        <img
                                            src={imgSrc}
                                            alt={`Estrella ${i}`}
                                            className={isWinner ? 'mc-estrella-ganadora-activa' : 'mc-estrella-img'}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {reward_available ? (
                            <div className="mc-mensaje-premio mc-mensaje-animado">
                                Tenés {fmtPrice(available_discount)} de descuento para tu próxima compra
                            </div>
                        ) : (
                            <div className="mc-info">
                                Te faltan <strong>{5 - active_purchases_count}</strong> compra{5 - active_purchases_count !== 1 ? 's' : ''} para tu próximo descuento
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'locales' && (
                <div className="card fade-in">
                    <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Nuestros Locales</h2>

                    <div style={{ borderRadius: 'var(--border-radius)', overflow: 'hidden', marginBottom: '1rem' }}>
                        <Suspense fallback={<div className="skeleton" style={{ height: '300px', borderRadius: 'var(--border-radius)' }} />}>
                            <StoresMap stores={STORES} />
                        </Suspense>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {STORES.map((store, idx) => (
                            <div key={idx} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.9rem' }}>{store.name}</strong>
                                    {store.tag && (
                                        <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: store.tag === 'Mayorista' ? '#fef3c7' : '#dbeafe', color: store.tag === 'Mayorista' ? '#92400e' : '#1e40af', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            {store.tag}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0' }}>{store.address}, {store.city}</p>
                                {store.hours && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{store.hours}</p>}
                                {store.phone && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{store.phone}</p>}
                                <span style={{ fontSize: '0.7rem', color: store.webChanges ? '#166534' : '#991b1b' }}>
                                    {store.webChanges ? 'Acepta cambios de compras web' : 'No acepta cambios de compras web'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'comments' && (
                <div className="fade-in">
                    {/* Sub-tab nav */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        {([['all', 'Todas'], ['mine', 'Mis opiniones'], ['new', 'Escribir']] as const).map(([key, label]) => (
                            <button
                                key={key}
                                className={`btn ${commentSubTab === key ? 'btn-primary' : 'btn-outline'}`}
                                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', minHeight: '34px' }}
                                onClick={() => setCommentSubTab(key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* All Comments */}
                    {commentSubTab === 'all' && (
                        <div className="card">
                            <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Opiniones de clientes</h2>
                            {loadingAllComments ? (
                                <div>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '60px', marginBottom: '0.5rem', borderRadius: '8px' }}></div>)}</div>
                            ) : allComments.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem 0' }}>Aún no hay opiniones.</p>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {allComments.map(c => (
                                            <div key={c.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{c.client_name || c.client_email}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>{c.store_name}</span>
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                                        {new Date(c.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.3rem' }}>
                                                    {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                                                </div>
                                                <p style={{ fontSize: '0.85rem', margin: 0 }}>{c.body}</p>
                                                {c.admin_reply && (
                                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                                                        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 0.2rem 0' }}>Respuesta de Magic Club</p>
                                                        <p style={{ fontSize: '0.8rem', margin: 0 }}>{c.admin_reply}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {Math.ceil(allCommentsTotal / 20) > 1 && (
                                        <div className="pagination" style={{ marginTop: '1rem' }}>
                                            <button className="btn btn-outline" disabled={allCommentsPage <= 1} onClick={() => setAllCommentsPage(p => p - 1)}>Anterior</button>
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Página {allCommentsPage} de {Math.ceil(allCommentsTotal / 20)}</span>
                                            <button className="btn btn-outline" disabled={allCommentsPage >= Math.ceil(allCommentsTotal / 20)} onClick={() => setAllCommentsPage(p => p + 1)}>Siguiente</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* My Comments */}
                    {commentSubTab === 'mine' && (
                        <div className="card">
                            <h2 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Mis opiniones</h2>
                            {loadingComments ? (
                                <div>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '60px', marginBottom: '0.5rem', borderRadius: '8px' }}></div>)}</div>
                            ) : comments.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '1.5rem 0' }}>Aún no dejaste ninguna opinión.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {comments.map(c => (
                                        <div key={c.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                <strong style={{ fontSize: '0.85rem' }}>{c.store_name}</strong>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                    {new Date(c.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.3rem' }}>
                                                {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                                            </div>
                                            <p style={{ fontSize: '0.85rem', margin: 0 }}>{c.body}</p>
                                            {c.admin_reply && (
                                                <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 0.2rem 0' }}>Respuesta de Magic Club</p>
                                                    <p style={{ fontSize: '0.8rem', margin: 0 }}>{c.admin_reply}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* New Comment Form */}
                    {commentSubTab === 'new' && (
                        <div className="card">
                            <h2 style={{ marginBottom: '1.25rem', fontSize: '1.15rem' }}>Dejanos tu opinión</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label">Sucursal</label>
                                    <select
                                        className="input-field"
                                        value={commentStore}
                                        onChange={(e) => setCommentStore(e.target.value)}
                                    >
                                        <option value="">Seleccionar sucursal...</option>
                                        <option value="Tienda Online">Tienda Online</option>
                                        {STORES.filter(s => !s.tag || s.tag !== 'Próximamente').map((s, i) => (
                                            <option key={i} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label">Calificación</label>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setCommentRating(n)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', padding: '0.1rem',
                                                    color: n <= commentRating ? '#f59e0b' : '#d1d5db',
                                                    transition: 'color 0.15s',
                                                }}
                                            >
                                                ★
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label">Comentario</label>
                                    <textarea
                                        className="input-field"
                                        rows={3}
                                        placeholder="Contanos tu experiencia..."
                                        value={commentBody}
                                        onChange={(e) => setCommentBody(e.target.value.slice(0, 1000))}
                                        style={{ resize: 'vertical', minHeight: '80px' }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>{commentBody.length}/1000</span>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={handleSubmitComment}
                                    disabled={submittingComment}
                                    style={{ alignSelf: 'flex-start' }}
                                >
                                    {submittingComment ? 'Enviando...' : 'Enviar opinión'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
