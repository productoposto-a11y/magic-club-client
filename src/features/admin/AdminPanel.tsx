import { useAuth } from '../../core/auth/AuthContext';

export default function AdminPanel() {
    const { logout } = useAuth();

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>Panel de Administración</h1>
                <button onClick={logout} className="btn" style={{ border: '1px solid var(--color-border)' }}>Salir</button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>

                <div className="card" style={{ flex: '1 1 100%' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Métricas Globales (Próximamente)</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>

                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Clientes</p>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)' }}>---</p>
                        </div>

                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Compras Registradas</p>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>---</p>
                        </div>

                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-border)' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase' }}>Premios Entregados</p>
                            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)' }}>---</p>
                        </div>

                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <p><strong>Info:</strong> Las métricas detalladas y la creación de sucursales estarán disponibles en la próxima fase. Actualmente el sistema enfoca todos sus recursos en procesar las reglas de negocio entre la Sucursal (Cuidar), Frontend de Clientes, y WooCommerce.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
