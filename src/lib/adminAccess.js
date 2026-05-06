export const MATRIXSALES_FULL_ADMIN_EMAILS = ['shareef6695@gmail.com'];

export function isMatrixSalesAdminEmail(email, configuredEmails = '') {
  const envEmails = configuredEmails
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);

  return [...MATRIXSALES_FULL_ADMIN_EMAILS, ...envEmails].includes(email?.toLowerCase());
}
