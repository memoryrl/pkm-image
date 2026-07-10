import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { getPokeballFaviconHref } from './components/PokeballIcon.jsx';
import './App.css';

const favicon = document.querySelector('link[rel="icon"]');
if (favicon) {
  favicon.href = getPokeballFaviconHref();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
