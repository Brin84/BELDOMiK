import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import { TelegramProvider } from './app/providers/TelegramProvider';
import { ThemeProvider } from './app/providers/ThemeProvider';
import './app/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <TelegramProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </TelegramProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);