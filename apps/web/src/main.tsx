import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/providers';
import './styles/index.css';
import './lib/i18n';

const root = document.getElementById('root');
if (!root) throw new Error('#root element not found');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
