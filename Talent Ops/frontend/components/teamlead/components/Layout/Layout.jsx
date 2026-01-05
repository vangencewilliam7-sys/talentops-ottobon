import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Chatbot from '../UI/Chatbot';

const Layout = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const location = useLocation();

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsCollapsed(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={() => setIsCollapsed(!isCollapsed)} />
            <div style={{
                marginLeft: isCollapsed ? '80px' : '260px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                transition: 'margin-left 0.3s ease'
            }}>
                <Header />
                <main style={{ flex: 1, padding: 'var(--spacing-xl)', backgroundColor: 'var(--background)' }}>
                    {children}
                </main>
                <Chatbot />
            </div>
        </div>
    );
};

export default Layout;
