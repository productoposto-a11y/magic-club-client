import React, { useState, useEffect } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getClientProfile, createPurchase, redeemReward } from '../../core/api/clientService';
import { getStoreStats, getStorePurchases } from '../../core/api/storeService';
import { extractApiError } from '../../core/api/errors';
import type { ClientProfileResponse, StoreStats, StorePurchaseItem } from '../../core/types/api';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

interface ConfirmAction {
    type: 'purchase' | 'redeem';
    message: string;
}

export default function StorePos() {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'scan' | 'purchases' | 'dashboard'>('scan');

    // === SCAN TAB STATE ===
    const [scannerActive, setScannerActive] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [clientData, setClientData] = useState<ClientProfileResponse | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [purchaseAmount, setPurchaseAmount] = useState<number | ''>('');
    const [loadingTx, setLoadingTx] = useState(false);
    const [txSuccess, setTxSuccess] = useState('');
    const [txError, setTxError] = useState('');
    const [amountError, setAmountError] = useState('');
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

    // === PURCHASES TAB STATE ===
    const [storePurchases, setStorePurchases] = useState<StorePurchaseItem[]>([]);
    const [purchaseSummary, setPurchaseSummary] = useState({ total_amount: 0, total_discount: 0 });
    const [purchaseMeta, setPurchaseMeta] = useState({ current_page: 1, page_size: 20, total_records: 0 });
    const [loadingPurchases, setLoadingPurchases] = useState(false);

    // === DASHBOARD TAB STATE ===
    const [stats, setStats] = useState<StoreStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const STORE_ID = '00000000-0000-0000-0000-000000000000';

    // === SCAN TAB LOGIC ===
    const fetchClient = async (identifier: string) => {
        setLoadingSearch(true);
        setSearchError('');
        setClientData(null);
        setTxSuccess('');
        setTxError('');

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

    const refreshClientData = async () => {
        if (!clientData) return;
        try {
            const data = await getClientProfile(clientData.client.email);
            setClientData(data);
        } catch {
            setClientData(null);
        }
    };

    const validateAmount = (): boolean => {
        setAmountError('');
        const amount = Number(purchaseAmount);
        if (!purchaseAmount || amount <= 0) {
            setAmountError('Ingrese un monto mayor a 0.');
            return false;
        }
        if (amount > 10_000_000) {
            setAmountError('El monto no puede superar $10.000.000.');
            return false;
        }
        return true;
    };

    const requestConfirmation = (type: 'purchase' | 'redeem') => {
        if (type === 'purchase') {
            if (!validateAmount()) return;
            setConfirmAction({
                type: 'purchase',
                message: `¿Registrar compra de $${Number(purchaseAmount).toFixed(2)}?`,
            });
        } else {
            if (!clientData) return;
            setConfirmAction({
                type: 'redeem',
                message: `¿Confirmar descuento de $${clientData.status.available_discount.toFixed(2)}?`,
            });
        }
    };

    const processTransaction = async (type: 'purchase' | 'redeem') => {
        if (!clientData) return;
        setLoadingTx(true);
        setTxError('');
        setTxSuccess('');
        setConfirmAction(null);

        try {
            if (type === 'redeem') {
                await redeemReward(clientData.client.id, STORE_ID, clientData.status.available_discount);
                setTxSuccess(`¡Premio canjeado! Descuento aplicado: $${clientData.status.available_discount.toFixed(2)}`);
            } else {
                await createPurchase(clientData.client.id, STORE_ID, Number(purchaseAmount));
                setTxSuccess(`¡Compra de $${Number(purchaseAmount).toFixed(2)} registrada exitosamente!`);
                setPurchaseAmount('');
            }

            await refreshClientData();
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

    // Fetch data when switching tabs
    useEffect(() => {
        if (activeTab === 'purchases') {
            fetchStorePurchases(1);
        } else if (activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab]);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>

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
                <div className="flex-cards">
                    {/* Scanner Panel */}
                    <div className="card" style={{ flex: '1 1 300px' }}>
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

                    {/* Transaction Panel */}
                    <div className="card" style={{ flex: '1 1 400px' }}>
                        <h2 style={{ marginBottom: '1.5rem' }}>Gestión de Venta</h2>

                        {!clientData ? (
                            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', border: '1px dashed var(--color-border)' }}>
                                Escanea un QR o busca un DNI para comenzar.
                            </div>
                        ) : (
                            <div>
                                <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Cliente: {clientData.client.email}</h3>
                                    {clientData.client.dni && <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>DNI: {clientData.client.dni}</p>}
                                    <p>Compras activas: <strong>{clientData.status.active_purchases_count} / 5</strong></p>
                                </div>

                                {txSuccess && <div className="alert-success">{txSuccess}</div>}
                                {txError && <div className="alert-error">{txError}</div>}

                                {clientData.status.reward_available ? (
                                    <div style={{ padding: '1.5rem', backgroundColor: '#fdf2f8', border: '2px solid var(--color-secondary)', borderRadius: 'var(--border-radius)' }}>
                                        <h3 style={{ color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>¡Premio Disponible!</h3>
                                        <p style={{ marginBottom: '1.5rem' }}>El cliente tiene un descuento a favor de <strong>${clientData.status.available_discount.toFixed(2)}</strong></p>

                                        <button onClick={() => requestConfirmation('redeem')} className="btn" style={{ width: '100%', backgroundColor: 'var(--color-secondary)', color: 'white' }} disabled={loadingTx}>
                                            {loadingTx ? 'Procesando...' : 'Aplicar Descuento y Canjear'}
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="input-group">
                                            <label className="input-label">Monto de Carga ($)</label>
                                            <input
                                                type="number"
                                                className="input-field"
                                                placeholder="Ej. 15000"
                                                value={purchaseAmount}
                                                onChange={(e) => {
                                                    setPurchaseAmount(Number(e.target.value) || '');
                                                    setAmountError('');
                                                }}
                                                min="1"
                                            />
                                            {amountError && <p className="input-error">{amountError}</p>}
                                        </div>
                                        <button onClick={() => requestConfirmation('purchase')} className="btn btn-primary" style={{ width: '100%' }} disabled={loadingTx || !purchaseAmount}>
                                            {loadingTx ? 'Procesando...' : 'Registrar Nueva Compra'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
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
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Cliente</th>
                                            <th>DNI</th>
                                            <th>Monto</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {storePurchases.map((p) => (
                                            <tr key={p.id}>
                                                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                                <td style={{ fontSize: '0.85rem' }}>{p.client_email}</td>
                                                <td>{p.client_dni}</td>
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

                            {/* Summary */}
                            <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)' }}>
                                <div>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Total Facturado</span>
                                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${purchaseSummary.total_amount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Total Descontado</span>
                                    <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${purchaseSummary.total_discount.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Pagination */}
                            {purchaseMeta.total_records > purchaseMeta.page_size && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                                    <button
                                        className="btn btn-outline"
                                        disabled={purchaseMeta.current_page <= 1}
                                        onClick={() => fetchStorePurchases(purchaseMeta.current_page - 1)}
                                    >
                                        Anterior
                                    </button>
                                    <span style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                        Página {purchaseMeta.current_page} de {Math.ceil(purchaseMeta.total_records / purchaseMeta.page_size)}
                                    </span>
                                    <button
                                        className="btn btn-outline"
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Compras</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{stats.total_purchases}</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Facturado</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>${stats.total_billed.toFixed(2)}</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Descontado</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>${stats.total_discounted.toFixed(2)}</p>
                            </div>
                            <div className="card" style={{ textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Neto</p>
                                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>${stats.total_net.toFixed(2)}</p>
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
                                    bottom: '2rem',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(255,255,255,0.95)',
                                    color: '#0f172a',
                                    fontSize: '1.1rem',
                                    padding: '0.85rem 2.5rem',
                                    borderRadius: '12px',
                                    fontWeight: 700,
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
