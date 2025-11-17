export function getEmailBody(email: string, password: string): string {
  return `
Your business account has been approved. Here are your login credentials:

Email: ${email}
Temporary Password: ${password}

Please verify your email address by clicking the verification link sent in a separate email. You must verify your email before you can log in.

  `.trim();
}