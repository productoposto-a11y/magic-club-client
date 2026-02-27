import { useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/AuthContext';
import { getAdminStats, getAdminClients } from '../../core/api/adminService';
import type { AdminStats, ClientListItem } from '../../core/types/api';

export default function AdminPanel() {
    const { logout, loggingOut } = useAuth();

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    const totalPages = Math.ceil(totalRecords / pageSize);

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
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

            {/* Clients Table */}
            <div className="card">
                <h2 style={{ marginBottom: '1.5rem' }}>Clientes Registrados</h2>

                {loading ? (
                    <div>
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="skeleton-row">
                                <div className="skeleton skeleton-text" style={{ flex: 2 }}></div>
                                <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
                                <div className="skeleton skeleton-text" style={{ flex: 1 }}></div>
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
                                        <th>Total Compras</th>
                                        <th>Premios</th>
                                        <th>Estado</th>
                                        <th>Registro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((c) => (
                                        <tr key={c.id}>
                                            <td>{c.email}</td>
                                            <td>{c.dni || '-'}</td>
                                            <td>{c.active_purchases_count} / 5</td>
                                            <td>{c.total_purchases}</td>
                                            <td>{c.total_rewards}</td>
                                            <td>
                                                {c.active_purchases_count >= 5 ? (
                                                    <span className="badge badge-active">Premio listo</span>
                                                ) : (
                                                    <span className="badge badge-used">Acumulando</span>
                                                )}
                                            </td>
                                            <td>{new Date(c.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="btn btn-outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Anterior
                                </button>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                    Página {page} de {totalPages}
                                </span>
                                <button
                                    className="btn btn-outline"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
