export const AUTH_TOKEN_CHANGED_EVENT = 'auth-token-changed';
export const AUTH_LOGIN_REQUIRED_EVENT = 'auth-login-required';

export function notifyAuthTokenChanged() {
  window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
}

export function notifyAuthLoginRequired() {
  window.dispatchEvent(new Event(AUTH_LOGIN_REQUIRED_EVENT));
}
