import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<React.StrictMode><main className="p-4"><h1 className="text-xl font-bold">WebSentinelKit</h1><p>Security analysis is not available yet.</p></main></React.StrictMode>);
