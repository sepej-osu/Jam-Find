import { Outlet } from 'react-router-dom';

const Layout = () => {
    return (
        <div>
            <header>
                <h1>Jam Find</h1>
                <h2>Discover and connect with local musicians</h2>
            </header>
            <main>
                <Outlet />
            </main>
            <footer>
                <p>&copy; 2026 Jam Find</p>
            </footer>
        </div>
    );
}

export default Layout;