const DEFAULT_API_BASE_URL = "https://elevoni-backend.vercel.app";

const readEnv = () => {
    try {
        return import.meta.env || {};
    } catch {
        return {};
    }
};

// Resolves the backend base URL for the admin application. The URL never
// carries a trailing slash so route paths can be appended directly.
export const resolveApiBaseUrl = (env = readEnv()) => {
    const configured = env?.VITE_API_BASE_URL;
    return String(configured || DEFAULT_API_BASE_URL).replace(/\/+$/, "");
};

export { DEFAULT_API_BASE_URL };
