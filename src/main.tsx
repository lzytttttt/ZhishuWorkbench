import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ServiceProvider } from './services/ServiceContext';
import { AppProvider } from './store/AppContext';
import './styles/global.css';
import './styles/services.css';
import './styles/classroom.css';
import './styles/fun.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ServiceProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </ServiceProvider>
  </React.StrictMode>,
);
