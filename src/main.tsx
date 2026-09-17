import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './studio/fonts.css';
import './studio/mobile.css';
import '@astryxdesign/core/reset.css';
import './studio/glyphdance.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
