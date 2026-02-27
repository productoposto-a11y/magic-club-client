import React, { useState, useEffect } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getClientProfile, createPurchase, redeemReward } from '../../core/api/clientService';
import { getStoreStats, getStorePurchases, voidPurchase } from '../../core/api/storeService';
import { extractApiError } from '../../core/api/errors';
import type { ClientProfileResponse, StoreStats, StorePurchaseItem } from '../../core/types/api';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

interface ConfirmAction {
    type: 'purchase' | 'purchase_and_redeem';
    message: string;
}

interface TxSummary {
    purchaseAmount: number;
    discountAmount: number;
    netAmount: number;
}

const fmtPrice = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StorePos() {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'scan' | 'purchases' | 'dashboard'>('scan');

    // === SCAN TAB STATE ===
    const [scannerActive, setScannerActive] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [clientData, setClientData] = useState<ClientProfileResponse | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [purchaseAmount, setPurchaseAmount] = useState('');
    const [dataVersion, setDataVersion] = useState(0);
    const [loadingTx, setLoadingTx] = useState(false);
    const [txSuccess, setTxSuccess] = useState('');
    const [txError, setTxError] = useState('');
    const [amountError, setAmountError] = useState('');
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
    const [lastTxSuccess, setLastTxSuccess] = useState('');
    const [txSummary, setTxSummary] = useState<TxSummary | null>(null);

    // === PURCHASES TAB STATE ===
    const [storePurchases, setStorePurchases] = useState<StorePurchaseItem[]>([]);
    const [purchaseSummary, setPurchaseSummary] = useState({ total_amount: 0, total_discount: 0 });
    const [purchaseMeta, setPurchaseMeta] = useState({ current_page: 1, page_size: 20, total_records: 0 });
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [voidingId, setVoidingId] = useState<string | null>(null);

    // === DASHBOARD TAB STATE ===
    const [stats, setStats] = useState<StoreStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const STORE_ID = '00000000-0000-0000-0000-000000000000';

    // Format number with dots as thousands separator (Argentine style)
    const formatPrice = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return '';
        return Number(digits).toLocaleString('es-AR');
    };

    const rawAmount = (): number => {
        return Number(purchaseAmount.replace(/\D/g, '')) || 0;
    };

    // === SCAN TAB LOGIC ===
    const fetchClient = async (identifier: string) => {
        setLoadingSearch(true);
        setSearchError('');
        setClientData(null);
        setTxSuccess('');
        setTxError('');
        setLastTxSuccess('');

        try {
            const data = await getClientProfile(identifier);
            setClientData(data);
            setScannerActive(false);
        } catch (err: any) {
            setSearchError(extractApiError(err, 'Cliente no encontrado.'));
        } finally {
            setLoadingSearch(false);
        }
    };

    const handleManualSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchInput) return;
        fetchClient(searchInput);
    };

    const validateAmount = (): boolean => {
        setAmountError('');
        const amount = rawAmount();
        if (!amount || amount <= 0) {
            setAmountError('Ingrese un monto mayor a 0.');
            return false;
        }
        if (amount > 10_000_000) {
            setAmountError('El monto no puede superar $10.000.000.');
            return false;
        }
        return true;
    };

    const requestConfirmation = (type: 'purchase' | 'purchase_and_redeem') => {
        if (!validateAmount()) return;
        const amount = rawAmount();

        if (type === 'purchase_and_redeem' && clientData) {
            const discount = clientData.status.available_discount;
            setConfirmAction({
                type: 'purchase_and_redeem',
                message: `¿Registrar compra de ${fmtPrice(amount)} y aplicar descuento de ${fmtPrice(discount)}? El cliente paga ${fmtPrice(amount - discount)}.`,
            });
        } else {
            setConfirmAction({
                type: 'purchase',
                message: `¿Registrar compra de ${fmtPrice(amount)}?`,
            });
        }
    };

    const processTransaction = async (type: 'purchase' | 'purchase_and_redeem') => {
        if (!clientData) return;
        setLoadingTx(true);
        setTxError('');
        setTxSuccess('');
        setConfirmAction(null);

        const amount = rawAmount();

        try {
            // Create the purchase — exclude from promo if redeeming reward simultaneously
            const excludeFromPromo = type === 'purchase_and_redeem';
            await createPurchase(clientData.client.id, STORE_ID, amount, excludeFromPromo);

            if (type === 'purchase_and_redeem') {
                // Then redeem the reward
                const discount = clientData.status.available_discount;
                await redeemReward(clientData.client.id, STORE_ID, discount);

                // Show summary modal
                setPurchaseAmount('');
                setClientData(null);
                setTxSummary({
                    purchaseAmount: amount,
                    discountAmount: discount,
                    netAmount: amount - discount,
                });
                setDataVersion(v => v + 1);
            } else {
                setPurchaseAmount('');
                setClientData(null);
                setLastTxSuccess(`¡Compra de ${fmtPrice(amount)} registrada exitosamente!`);
                setDataVersion(v => v + 1);
            }
        } catch (err: any) {
            setTxError(extractApiError(err, err.message || 'Error procesando la transacción.'));
        } finally {
            setLoadingTx(false);
        }
    };

    // === PURCHASES TAB LOGIC ===
    const fetchStorePurchases = async (page: number = 1) => {
        setLoadingPurchases(true);
        try {
            const data = await getStorePurchases(page, 20);
            setStorePurchases(data.purchases || []);
            setPurchaseSummary(data.summary);
            setPurchaseMeta(data.metadata);
        } catch {
            // Silent fail
        } finally {
            setLoadingPurchases(false);
        }
    };

    const handleVoidPurchase = async (purchaseId: string) => {
        if (!confirm('¿Invalidar esta compra? Esta acción no se puede deshacer.')) return;
        setVoidingId(purchaseId);
        try {
            await voidPurchase(purchaseId);
            fetchStorePurchases(purchaseMeta.current_page);
        } catch {
            alert('Error al invalidar la compra.');
        } finally {
            setVoidingId(null);
        }
    };

    // === DASHBOARD TAB LOGIC ===
    const fetchStats = async () => {
        setLoadingStats(true);
        try {
            const data = await getStoreStats();
            setStats(data);
        } catch {
            // Silent fail
        } finally {
            setLoadingStats(false);
        }
    };

    // Fetch data when switching tabs or after a transaction
    useEffect(() => {
        if (activeTab === 'purchases') {
            fetchStorePurchases(1);
        } else if (activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab, dataVersion]);

    return (
        <div className="container" style={{ paddingBottom: '2rem' }}>

            <div className="page-header">
                <h1>Terminal Sucursal</h1>
                <button onClick={logout} className="btn btn-outline">Salir</button>
            </div>

            {/* Tab Navigation */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="tab-nav">
                    <button
                        className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
                        onClick={() => setActiveTab('scan')}
                    >
                        Escanear
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purchases')}
                    >
                        Compras
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        Dashboard
                    </button>
                </div>
            </div>

            {/* === SCAN TAB === */}
            {activeTab === 'scan' && (
                <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                    {lastTxSuccess && (
                        <div className="alert-success" style={{ marginBottom: '1rem', cursor: 'pointer' }} onClick={() => setLastTxSuccess('')}>
                            {lastTxSuccess}
                        </div>
                    )}
                    <div className="card">
                        <h2 style={{ marginBottom: '1.5rem' }}>Buscar Cliente</h2>

                        <div style={{ marginBottom: '2rem' }}>
                            <button onClick={() => setScannerActive(true)} className="btn btn-primary" style={{ width: '100%' }}>
                                Activar Escáner QR
                            </button>
                        </div>

                        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1rem', fontWeight: 600 }}>O</div>

                        <form onSubmit={handleManualSearch}>
                            <div className="input-group">
                                <label className="input-label">Ingresar DNI manualmente</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="Ej. 35123456"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn-outline" style={{ width: '100%' }} disabled={loadingSearch || !searchInput}>
                                {loadingSearch ? 'Buscando...' : 'Buscar por DNI'}
                            </button>
                        </form>

                        {searchError && <p className="input-error" style={{ marginTop: '1rem' }}>{searchError}</p>}
                    </div>
                </div>
            )}

            {/* Client Transaction Modal */}
            {clientData && (
                <div className="modal-overlay" onClick={() => { setClientData(null); setTxSuccess(''); setTxError(''); setPurchaseAmount(''); setAmountError(''); }}>
                    <div className="modal" style={{ maxWidth: '480px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Gestión de Venta</h3>
                            <button
                                onClick={() => { setClientData(null); setTxSuccess(''); setTxError(''); setPurchaseAmount(''); setAmountError(''); }}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{clientData.client.email}</h3>
                            {clientData.client.dni && <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>DNI: {clientData.client.dni}</p>}
                            <p>Compras activas: <strong>{clientData.status.active_purchases_count} / 5</strong></p>
                        </div>

                        {txSuccess && <div className="alert-success">{txSuccess}</div>}
                        {txError && <div className="alert-error">{txError}</div>}

                        {clientData.status.reward_available && (
                            <div style={{ padding: '1rem', backgroundColor: '#fdf2f8', border: '2px solid var(--color-secondary)', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
                                <h3 style={{ color: 'var(--color-secondary)', marginBottom: '0.25rem', fontSize: '1rem' }}>¡Premio Disponible!</h3>
                                <p style={{ fontSize: '0.9rem' }}>Descuento a favor: <strong>{fmtPrice(clientData.status.available_discount)}</strong></p>
                            </div>
                        )}

                        <div>
                            <div className="input-group">
                                <label className="input-label">Monto de la Compra ($)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="input-field"
                                    placeholder="Ej. 15.000"
                                    value={purchaseAmount}
                                    onChange={(e) => {
                                        setPurchaseAmount(formatPrice(e.target.value));
                                        setAmountError('');
                                    }}
                                    style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '1px' }}
                                />
                                {amountError && <p className="input-error">{amountError}</p>}
                            </div>

                            {clientData.status.reward_available && purchaseAmount && (
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', marginBottom: '1rem', fontSize: 'clamp(0.8rem, 3.5vw, 0.9rem)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span>Compra</span>
                                        <span>{fmtPrice(rawAmount())}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', color: 'var(--color-secondary)' }}>
                                        <span>Descuento</span>
                                        <span>-{fmtPrice(clientData.status.available_discount)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                        <span>A cobrar</span>
                                        <span>{fmtPrice(Math.max(0, rawAmount() - clientData.status.available_discount))}</span>
                                    </div>
                                </div>
                            )}

                            {clientData.status.reward_available ? (
                                <button
                                    onClick={() => requestConfirmation('purchase_and_redeem')}
                                    className="btn"
                                    style={{ width: '100%', backgroundColor: 'var(--color-secondary)', color: 'white' }}
                                    disabled={loadingTx || !purchaseAmount}
                                >
                                    {loadingTx ? 'Procesando...' : 'Registrar Compra y Aplicar Descuento'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => requestConfirmation('purchase')}
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={loadingTx || !purchaseAmount}
                                >
                                    {loadingTx ? 'Procesando...' : 'Registrar Nueva Compra'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Summary Modal */}
            {txSummary && (
                <div className="modal-overlay" onClick={() => { setTxSummary(null); }}>
                    <div className="modal" style={{ maxWidth: '420px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Resumen de Operación</h3>

                        <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'clamp(0.85rem, 3.5vw, 1rem)' }}>
                                <span>Compra</span>
                                <span style={{ fontWeight: 600 }}>{fmtPrice(txSummary.purchaseAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: 'clamp(0.85rem, 3.5vw, 1rem)', color: 'var(--color-secondary)' }}>
                                <span>Descuento</span>
                                <span style={{ fontWeight: 600 }}>-{fmtPrice(txSummary.discountAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'clamp(0.9rem, 4vw, 1.15rem)', fontWeight: 700, borderTop: '2px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                <span>Total cobrado</span>
                                <span style={{ color: 'var(--color-success)' }}>{fmtPrice(txSummary.netAmount)}</span>
                            </div>
                        </div>

                        <div className="alert-success" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            Operación completada exitosamente
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            onClick={() => setTxSummary(null)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* === PURCHASES TAB === */}
            {activeTab === 'purchases' && (
                <div className="card">
                    <h2 style={{ marginBottom: '1.5rem' }}>Compras de esta Sucursal</h2>

                    {loadingPurchases ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : storePurchases.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>No hay compras registradas aún.</p>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th className="hide-mobile">Pedido</th>
                                            <th>Fecha</th>
                                            <th className="hide-mobile">Cliente</th>
                                            <th>DNI</th>
                                            <th>Monto</th>
                                            <th>Estado</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {storePurchases.map((p) => (
                                            <tr key={p.id} style={p.status === 'voided' ? { opacity: 0.5 } : undefined}>
                                                <td className="hide-mobile" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.order_id}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                                                <td className="hide-mobile" style={{ fontSize: '0.85rem' }}>{p.client_email}</td>
                                                <td>{p.client_dni}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{p.status === 'voided' ? <s>{fmtPrice(p.amount)}</s> : fmtPrice(p.amount)}</td>
                                                <td>
                                                    <span className={`badge ${p.status === 'active' ? 'badge-active' : p.status === 'voided' ? 'badge-voided' : 'badge-used'}`}>
                                                        {p.status === 'active' ? 'Activa' : p.status === 'voided' ? 'Anulada' : 'Usada'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {p.status === 'active' && (
                                                        <button
                                                            className="btn btn-outline"
                                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: 'var(--color-danger)', minHeight: '32px' }}
                                                            onClick={() => handleVoidPurchase(p.id)}
                                                            disabled={voidingId === p.id}
                                                        >
                                                            {voidingId === p.id ? '...' : 'Anular'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary */}
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)' }}>
                                <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Total Facturado</span>
                                    <p style={{ fontWeight: 700, fontSize: 'clamp(0.85rem, 3.5vw, 1rem)', wordBreak: 'break-word' }}>{fmtPrice(purchaseSummary.total_amount)}</p>
                                </div>
                                <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Total Descontado</span>
                                    <p style={{ fontWeight: 700, fontSize: 'clamp(0.85rem, 3.5vw, 1rem)', wordBreak: 'break-word' }}>{fmtPrice(purchaseSummary.total_discount)}</p>
                                </div>
                            </div>

                            {/* Pagination */}
                            {purchaseMeta.total_records > purchaseMeta.page_size && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                        disabled={purchaseMeta.current_page <= 1}
                                        onClick={() => fetchStorePurchases(purchaseMeta.current_page - 1)}
                                    >
                                        Anterior
                                    </button>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0 0.25rem' }}>
                                        {purchaseMeta.current_page} / {Math.ceil(purchaseMeta.total_records / purchaseMeta.page_size)}
                                    </span>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                                        disabled={purchaseMeta.current_page >= Math.ceil(purchaseMeta.total_records / purchaseMeta.page_size)}
                                        onClick={() => fetchStorePurchases(purchaseMeta.current_page + 1)}
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* === DASHBOARD TAB === */}
            {activeTab === 'dashboard' && (
                <div>
                    <h2 style={{ marginBottom: '1.5rem' }}>Dashboard</h2>

                    {loadingStats ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : stats ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                            <div className="card" style={{ textAlign: 'center', padding: '1rem', overflow: 'hidden' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Compras</p>
                                <p style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 800, color: 'var(--color-primary)' }}>{stats.total_purchases}</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '1rem', overflow: 'hidden' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Facturado</p>
                                <p style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.5rem)', fontWeight: 800, color: 'var(--color-primary)', wordBreak: 'break-word' }}>{fmtPrice(stats.total_billed)}</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '1rem', overflow: 'hidden' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Descontado</p>
                                <p style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.5rem)', fontWeight: 800, color: 'var(--color-secondary)', wordBreak: 'break-word' }}>{fmtPrice(stats.total_discounted)}</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center', padding: '1rem', overflow: 'hidden' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 600 }}>Neto</p>
                                <p style={{ fontSize: 'clamp(0.85rem, 3.5vw, 1.5rem)', fontWeight: 800, color: 'var(--color-success)', wordBreak: 'break-word' }}>{fmtPrice(stats.total_net)}</p>
                            </div>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No se pudieron cargar las estadísticas.</p>
                    )}
                </div>
            )}

            {/* QR Scanner Fullscreen Modal */}
            {scannerActive && (
                <div className="qr-fullscreen-overlay" style={{ backgroundColor: '#000000' }}>
                    <div className="qr-fullscreen-content" style={{ padding: 0 }}>
                        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <BarcodeScannerComponent
                                width="100%"
                                height="100%"
                                onUpdate={(err, result) => {
                                    if (err) { /* ignore */ }
                                    if (result) {
                                        setScannerActive(false);
                                        fetchClient(result.getText());
                                    }
                                }}
                            />
                            <button
                                onClick={() => setScannerActive(false)}
                                className="btn"
                                style={{
                                    position: 'absolute',
                                    bottom: 'max(2rem, env(safe-area-inset-bottom, 1rem))',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                    color: '#0f172a',
                                    fontSize: '1.1rem',
                                    padding: '1rem 2.5rem',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    minWidth: '200px',
                                }}
                            >
                                Cerrar Escáner
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Confirmar Operación</h3>
                        <p>{confirmAction.message}</p>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setConfirmAction(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={() => processTransaction(confirmAction.type)}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
