import { useState, useEffect, useRef } from 'react';

export interface Tab {
    key: string;
    label: string;
}

interface TabNavProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (key: string) => void;
}

export default function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const activeLabel = tabs.find(t => t.key === activeTab)?.label || '';

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSelect = (key: string) => {
        onTabChange(key);
        setOpen(false);
    };

    return (
        <div className="tabnav-wrapper" ref={wrapperRef}>
            {/* Desktop: horizontal tabs */}
            <div className="tabnav-desktop">
                <div className="tab-nav">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mobile: hamburger + dropdown */}
            <div className="tabnav-mobile">
                <button
                    className={`hamburger-btn ${open ? 'open' : ''}`}
                    onClick={() => setOpen(!open)}
                    aria-label="Menú"
                    aria-expanded={open}
                >
                    <span className="hamburger-line" />
                    <span className="hamburger-line" />
                    <span className="hamburger-line" />
                    <span className="hamburger-sparkle" />
                </button>
                <span className="tabnav-mobile-label">{activeLabel}</span>
            </div>

            {/* Dropdown menu */}
            <div className={`tabnav-dropdown ${open ? 'open' : ''}`}>
                {tabs.map((tab, i) => (
                    <button
                        key={tab.key}
                        className={`tabnav-dropdown-item ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => handleSelect(tab.key)}
                        style={{ animationDelay: open ? `${i * 0.05}s` : '0s' }}
                    >
                        <span className="tabnav-dropdown-star">&#9733;</span>
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
