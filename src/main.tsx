import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './studio/fonts.css';
import '@astryxdesign/core/reset.css';
import { Theme } from '@astryxdesign/core/theme';
import { glyphdanceTheme } from './studio/glyphdance.js';
import './studio/glyphdance.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={glyphdanceTheme} mode="dark">
      <App />
    </Theme>
  </StrictMode>,
);
