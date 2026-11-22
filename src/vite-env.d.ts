/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** mock（默认）| remote */
  readonly VITE_SERVICE_MODE?: string;
  /** 浏览器访问的网关地址，默认 /api */
  readonly VITE_API_BASE?: string;
  /** 默认模型 ID */
  readonly VITE_DEFAULT_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
