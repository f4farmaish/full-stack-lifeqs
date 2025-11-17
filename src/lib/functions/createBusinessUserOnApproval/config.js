"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailBody = getEmailBody;
function getEmailBody(email, password) {
    return `
Your business account has been approved. Here are your login credentials:

Email: ${email}
Temporary Password: ${password}

Please verify your email address by clicking the verification link sent in a separate email. You must verify your email before you can log in.

  `.trim();
}
