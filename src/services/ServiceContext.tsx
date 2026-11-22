import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_CONFIG, loadConfig, normalizeConfig, saveConfig, type ServiceConfig } from './config';
import { createServices, type Services } from './container';

interface ServiceCtx {
  config: ServiceConfig;
  services: Services;
  updateConfig: (next: ServiceConfig) => void;
  resetConfig: () => void;
}

const Ctx = createContext<ServiceCtx | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ServiceConfig>(loadConfig);
  const services = useMemo(() => createServices(config), [config]);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const updateConfig = useCallback((next: ServiceConfig) => setConfig(normalizeConfig(next)), []);
  const resetConfig = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  const value = useMemo(() => ({ config, services, updateConfig, resetConfig }), [config, services, updateConfig, resetConfig]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useCtx(): ServiceCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useServices must be used within ServiceProvider');
  return v;
}

/** 页面获取服务的唯一入口 */
export const useServices = (): Services => useCtx().services;

export function useServiceConfig() {
  const { config, updateConfig, resetConfig } = useCtx();
  return { config, updateConfig, resetConfig };
}
