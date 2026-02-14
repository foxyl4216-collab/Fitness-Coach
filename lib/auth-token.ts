let _currentToken: string | null = null;

export function getStoredToken(): string | null {
  return _currentToken;
}

export function setStoredToken(token: string | null): void {
  _currentToken = token;
}
