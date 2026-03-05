import { useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getAdminStats, getAdminClients, getAdminTopClients, getAdminTimeStats, getAdminComments, replyToComment, deleteComment } from '../../core/api/adminService';
import { apiClient } from '../../core/api/axios';
import type { AdminStats, ClientListItem, TimeStat, CommentWithEmail } from '../../core/types/api';
import TabNav from '../../components/TabNav';

const fmtPrice = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminPanel() {
    const { logout, loggingOut } = useAuth();

    const [activeTab, setActiveTab] = useState<'clients' | 'ranking' | 'stats' | 'comments'>('clients');
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Ranking
    const [topClients, setTopClients] = useState<ClientListItem[]>([]);
    const [loadingTop, setLoadingTop] = useState(false);

    // Time stats
    const [timeStats, setTimeStats] = useState<TimeStat[]>([]);
    const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [loadingTime, setLoadingTime] = useState(false);

    // Comments
    const [adminComments, setAdminComments] = useState<CommentWithEmail[]>([]);
    const [commentsTotal, setCommentsTotal] = useState(0);
    const [commentsPage, setCommentsPage] = useState(1);
    const [loadingComments, setLoadingComments] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');

    const pageSize = 20;

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getAdminStats();
                setStats(data);
            } catch {
                setError('Error cargando estadísticas.');
            }
        };
        fetchStats();
    }, []);

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            try {
                const data = await getAdminClients(page, pageSize);
                setClients(data.clients || []);
                setTotalRecords(data.metadata.total_records);
            } catch {
                setError('Error cargando clientes.');
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, [page]);

    useEffect(() => {
        if (activeTab === 'ranking' && topClients.length === 0) {
            setLoadingTop(true);
            getAdminTopClients().then(setTopClients).catch(() => {}).finally(() => setLoadingTop(false));
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'stats') {
            setLoadingTime(true);
            getAdminTimeStats(timePeriod).then(d => setTimeStats(d.stats)).catch(() => {}).finally(() => setLoadingTime(false));
        }
    }, [activeTab, timePeriod]);

    useEffect(() => {
        if (activeTab === 'comments') {
            setLoadingComments(true);
            getAdminComments(commentsPage, pageSize)
                .then(data => { setAdminComments(data.comments || []); setCommentsTotal(data.metadata.total_records); })
                .catch(() => {})
                .finally(() => setLoadingComments(false));
        }
    }, [activeTab, commentsPage]);

    const commentsTotalPages = Math.ceil(commentsTotal / pageSize);

    const handleReply = async (commentId: string) => {
        if (!replyText.trim()) return;
        try {
            await replyToComment(commentId, replyText.trim());
            setAdminComments(prev => prev.map(c => c.id === commentId ? { ...c, admin_reply: replyText.trim(), replied_at: new Date().toISOString() } : c));
            setReplyingTo(null);
            setReplyText('');
        } catch { /* silent */ }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('¿Eliminar este comentario?')) return;
        try {
            await deleteComment(commentId);
            setAdminComments(prev => prev.filter(c => c.id !== commentId));
            setCommentsTotal(prev => prev - 1);
        } catch { /* silent */ }
    };

    const totalPages = Math.ceil(totalRecords / pageSize);

    const maxTotal = Math.max(...timeStats.map(s => s.total), 1);

    const handleExport = async (type: 'clients' | 'purchases') => {
        try {
            const res = await apiClient.get(`/admin/export/${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = type === 'clients' ? 'clientes.csv' : 'compras.csv';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { /* silent */ }
    };

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>

            <div className="page-header">
                <h1>Panel de Administración</h1>
                <button onClick={logout} className="btn btn-outline" disabled={loggingOut}>
                    {loggingOut ? <><span className="spinner-inline-dark"></span>Saliendo...</> : 'Salir'}
                </button>
            </div>

            {error && <div className="alert-error">{error}</div>}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                {stats ? (
                    <>
                        <div className="stat-card">
                            <p className="stat-label">Total Clientes</p>
                            <p className="stat-value" style={{ color: 'var(--color-text)' }}>{stats.total_clients}</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">Compras Registradas</p>
                            <p className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.total_purchases}</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">Compras Activas</p>
                            <p className="stat-value" style={{ color: 'var(--color-primary)' }}>{stats.total_active_purchases}</p>
                        </div>
                        <div className="stat-card">
                            <p className="stat-label">Premios Entregados</p>
                            <p className="stat-value" style={{ color: 'var(--color-secondary)' }}>{stats.total_rewards}</p>
                        </div>
                    </>
                ) : (
                    [1,2,3,4].map(i => (
                        <div key={i} className="stat-card" style={{ padding: '1.5rem' }}>
                            <div className="skeleton skeleton-text-sm" style={{ width: '65%', marginBottom: '0.75rem' }}></div>
                            <div className="skeleton skeleton-stat" style={{ width: '50%' }}></div>
                        </div>
                    ))
                )}
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => handleExport('clients')}>
                    Exportar Clientes CSV
                </button>
                <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => handleExport('purchases')}>
                    Exportar Compras CSV
                </button>
            </div>

            {/* Tab Navigation */}
            <TabNav
                tabs={[
                    { key: 'clients', label: 'Clientes' },
                    { key: 'ranking', label: 'Ranking' },
                    { key: 'stats', label: 'Estadísticas' },
                    { key: 'comments', label: 'Opiniones' },
                ]}
                activeTab={activeTab}
                onTabChange={(key) => setActiveTab(key as typeof activeTab)}
            />

            {/* Clients Tab */}
            {activeTab === 'clients' && (
                <div className="card fade-in">
                    <h2 style={{ marginBottom: '1.5rem' }}>Clientes Registrados</h2>

                    {loading ? (
                        <div>
                            {[1,2,3,4,5].map(i => (
                                <div key={i} className="skeleton-row">
                                    <div className="skeleton skeleton-text" style={{ flex: 2 }}></div>
                                    <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
                                    <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
                                </div>
                            ))}
                        </div>
                    ) : clients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No hay clientes registrados.</div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>DNI</th>
                                            <th>Compras Activas</th>
                                            <th className="hide-mobile">Total Compras</th>
                                            <th className="hide-mobile">Premios</th>
                                            <th>Estado</th>
                                            <th className="hide-mobile">Registro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.map((c) => (
                                            <tr key={c.id}>
                                                <td>{c.email}</td>
                                                <td>{c.dni || '-'}</td>
                                                <td>{c.active_purchases_count} / 5</td>
                                                <td className="hide-mobile">{c.total_purchases}</td>
                                                <td className="hide-mobile">{c.total_rewards}</td>
                                                <td>
                                                    {c.active_purchases_count >= 5 ? (
                                                        <span className="badge badge-active">Premio listo</span>
                                                    ) : (
                                                        <span className="badge badge-used">Acumulando</span>
                                                    )}
                                                </td>
                                                <td className="hide-mobile">{new Date(c.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Página {page} de {totalPages}</span>
                                    <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Ranking Tab */}
            {activeTab === 'ranking' && (
                <div className="card fade-in">
                    <h2 style={{ marginBottom: '1.5rem' }}>Top 10 Clientes por Gasto</h2>

                    {loadingTop ? (
                        <div>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '48px', marginBottom: '0.5rem', borderRadius: '8px' }}></div>)}</div>
                    ) : topClients.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>No hay datos aún.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {topClients.map((c, idx) => (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: idx < 3 ? '#fffbeb' : 'var(--color-bg)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: idx === 0 ? '#d97706' : idx === 1 ? '#6b7280' : idx === 2 ? '#b45309' : 'var(--color-text-muted)', minWidth: '28px' }}>
                                        #{idx + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.total_purchases} compras · {c.total_rewards} premios</p>
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                        {c.active_purchases_count}/5
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
                <div className="card fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h2>Ventas (últimos 90 días)</h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {(['daily', 'weekly', 'monthly'] as const).map(p => (
                                <button
                                    key={p}
                                    className={`btn ${timePeriod === p ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', minHeight: '32px' }}
                                    onClick={() => setTimePeriod(p)}
                                >
                                    {p === 'daily' ? 'Diario' : p === 'weekly' ? 'Semanal' : 'Mensual'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loadingTime ? (
                        <div>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '24px', marginBottom: '0.5rem', borderRadius: '4px' }}></div>)}</div>
                    ) : timeStats.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>No hay datos para este período.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {timeStats.map((s, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                                    <span style={{ minWidth: '75px', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {new Date(s.period + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <div style={{ flex: 1, height: '22px', backgroundColor: 'var(--color-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${Math.max((s.total / maxTotal) * 100, 2)}%`,
                                            height: '100%',
                                            backgroundColor: 'var(--color-primary)',
                                            borderRadius: '4px',
                                            transition: 'width 0.3s ease',
                                            opacity: 0.8,
                                        }} />
                                    </div>
                                    <span style={{ minWidth: '55px', textAlign: 'right', fontWeight: 600, fontSize: '0.75rem' }}>{fmtPrice(s.total)}</span>
                                    <span style={{ minWidth: '25px', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{s.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
                <div className="card fade-in">
                    <h2 style={{ marginBottom: '1.5rem' }}>Opiniones de Clientes</h2>

                    {loadingComments ? (
                        <div>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '80px', marginBottom: '0.75rem', borderRadius: '8px' }}></div>)}</div>
                    ) : adminComments.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem 0' }}>No hay opiniones aún.</p>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {adminComments.map(c => (
                                    <div key={c.id} style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                            <div>
                                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.client_name || c.client_email}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>{c.store_name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                                {new Date(c.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginBottom: '0.3rem' }}>
                                            {'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}
                                        </div>
                                        <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>{c.body}</p>

                                        {c.admin_reply && (
                                            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)', marginBottom: '0.5rem' }}>
                                                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', margin: '0 0 0.2rem 0' }}>Tu respuesta</p>
                                                <p style={{ fontSize: '0.8rem', margin: 0 }}>{c.admin_reply}</p>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {replyingTo === c.id ? (
                                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    <textarea
                                                        className="input-field"
                                                        rows={2}
                                                        placeholder="Escribí tu respuesta..."
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value.slice(0, 1000))}
                                                        style={{ resize: 'vertical', fontSize: '0.8rem' }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', minHeight: 'unset' }} onClick={() => handleReply(c.id)}>Enviar</button>
                                                        <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', minHeight: 'unset' }} onClick={() => { setReplyingTo(null); setReplyText(''); }}>Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', minHeight: 'unset' }}
                                                        onClick={() => { setReplyingTo(c.id); setReplyText(c.admin_reply || ''); }}
                                                    >
                                                        {c.admin_reply ? 'Editar respuesta' : 'Responder'}
                                                    </button>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', minHeight: 'unset', color: '#dc2626', borderColor: '#dc2626' }}
                                                        onClick={() => handleDeleteComment(c.id)}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {commentsTotalPages > 1 && (
                                <div className="pagination" style={{ marginTop: '1rem' }}>
                                    <button className="btn btn-outline" disabled={commentsPage <= 1} onClick={() => setCommentsPage(p => p - 1)}>Anterior</button>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Página {commentsPage} de {commentsTotalPages}</span>
                                    <button className="btn btn-outline" disabled={commentsPage >= commentsTotalPages} onClick={() => setCommentsPage(p => p + 1)}>Siguiente</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
