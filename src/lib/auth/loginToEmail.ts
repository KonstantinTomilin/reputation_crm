const LOGIN_REGEX = /^[a-z0-9._-]+$/;

export function normalizeLogin(login: string): string {
  const normalized = login.trim().toLowerCase();
  if (!normalized) throw new Error('Логин не может быть пустым');
  if (!LOGIN_REGEX.test(normalized)) {
    throw new Error('Логин содержит недопустимые символы');
  }
  return normalized;
}

export function loginToTechnicalEmail(login: string): string {
  return `${normalizeLogin(login)}@crm.local`;
}

export function isTechnicalCrmEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@crm.local');
}

