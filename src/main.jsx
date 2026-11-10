import './ava/css/app.css';
import './shim/route';
import { createRoot } from 'react-dom/client';
import { installNetworkGuard } from './mock/server';
import './mock/handlers';
import { bootstrapPage, usePage } from './shim/inertia';
import DemoChrome from './demo/DemoChrome';

installNetworkGuard();

const pages = {
    ...import.meta.glob('./ava/Pages/**/*.jsx', { eager: true }),
    ...import.meta.glob('./demo/pages/*.jsx', { eager: true }),
};

function resolve(name) {
    const path = name.startsWith('Demo/') ? `./demo/pages/${name.slice(5)}.jsx` : `./ava/Pages/${name}.jsx`;
    const module = pages[path];
    if (!module) throw new Error(`Page component not found: ${name}`);
    return module.default;
}

function App() {
    const page = usePage();
    const Page = resolve(page.component);
    const element = <Page key={page.key} {...page.props} />;
    return (
        <>
            {Page.layout ? Page.layout(element) : element}
            <DemoChrome />
        </>
    );
}

bootstrapPage();
createRoot(document.getElementById('root')).render(<App />);
