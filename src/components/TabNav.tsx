import type { ReactNode } from 'react';

export interface Tab {
    key: string;
    label: string;
    icon?: ReactNode;
}

interface TabNavProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (key: string) => void;
}

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
    return (
        <>
            {/* Desktop: pill navigation */}
            <div className="pill-nav-wrapper">
                <nav className="pill-nav">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`pill-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.key)}
                        >
                            {tab.icon && <span className="pill-btn-icon">{tab.icon}</span>}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Mobile: fixed bottom navigation */}
            <nav className="bottom-nav">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`bottom-nav-item ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.key)}
                        aria-label={tab.label}
                    >
                        <span className="bottom-nav-icon">{tab.icon}</span>
                        <span className="bottom-nav-label">{tab.label}</span>
                    </button>
                ))}
            </nav>
        </>
    );
}
