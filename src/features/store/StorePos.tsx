import React, { useState } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getClientProfile, createPurchase, redeemReward } from '../../core/api/clientService';
import { extractApiError } from '../../core/api/errors';
import type { ClientProfileResponse } from '../../core/types/api';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

interface ConfirmAction {
    type: 'purchase' | 'redeem';
    message: string;
}

export default function StorePos() {
    const { logout } = useAuth();
    const [scannerActive, setScannerActive] = useState(false);

    // Client Lookup
    const [searchInput, setSearchInput] = useState('');
    const [clientData, setClientData] = useState<ClientProfileResponse | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Transaction
    const [purchaseAmount, setPurchaseAmount] = useState<number | ''>('');
    const [loadingTx, setLoadingTx] = useState(false);
    const [txSuccess, setTxSuccess] = useState('');
    const [txError, setTxError] = useState('');
    const [amountError, setAmountError] = useState('');

    // Confirmation modal
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

    const STORE_ID = '00000000-0000-0000-0000-000000000000';

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

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>

            <div className="page-header">
                <h1>Terminal Sucursal</h1>
                <button onClick={logout} className="btn btn-outline">Salir</button>
            </div>

            <div className="flex-cards">

                {/* Scanner Panel */}
                <div className="card" style={{ flex: '1 1 300px' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Buscar Cliente</h2>

                    <div style={{ marginBottom: '2rem' }}>
                        {scannerActive ? (
                            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--color-primary)' }}>
                                <BarcodeScannerComponent
                                    width="100%"
                                    height={250}
                                    onUpdate={(err, result) => {
                                        if (err) { /* ignore periodic scan errors */ }
                                        if (result) fetchClient(result.getText());
                                    }}
                                />
                                <button onClick={() => setScannerActive(false)} className="btn btn-outline" style={{ width: '100%', borderRadius: 0 }}>Detener Cámara</button>
                            </div>
                        ) : (
                            <button onClick={() => setScannerActive(true)} className="btn btn-primary" style={{ width: '100%' }}>
                                Activar Escáner QR
                            </button>
                        )}
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
