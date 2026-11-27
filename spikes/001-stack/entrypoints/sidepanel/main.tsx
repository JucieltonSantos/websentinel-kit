import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<React.StrictMode><main className="p-4 text-slate-800"><h1 className="text-xl font-bold">Stack spike</h1><p>Side Panel prototype is running.</p></main></React.StrictMode>);
