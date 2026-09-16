import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/theme-neutral/theme.css';
import { Theme } from '@astryxdesign/core/theme';
import { glyphdanceTheme } from './studio/theme.ts';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={glyphdanceTheme} mode="dark">
      <App />
    </Theme>
  </StrictMode>,
);
