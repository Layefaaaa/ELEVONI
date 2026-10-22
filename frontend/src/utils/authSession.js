export const AUTH_TOKEN_STORAGE_KEY = "token";

const isUsableToken = (token) =>
  typeof token === "string" && token.trim().length > 0;

export const readStoredToken = (storage) => {
  const stored = storage?.getItem(AUTH_TOKEN_STORAGE_KEY);
  return isUsableToken(stored) ? stored : "";
};

export const persistStoredToken = (storage, token) => {
  if (!storage || !isUsableToken(token)) return false;
  storage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  return true;
};

export const clearStoredToken = (storage) => {
  if (!storage) return false;
  storage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  return true;
};

export const isUnauthorizedResponse = (error) =>
  error?.response?.status === 401;
