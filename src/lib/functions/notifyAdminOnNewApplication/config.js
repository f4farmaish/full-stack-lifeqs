"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmailBody = getEmailBody;
function getEmailBody(application) {
    return `
A new business account application has been submitted:

Company Name: ${application.companyName}
Registration Number: ${application.registrationNumber}
Business Email: ${application.businessEmail}
Contact Person: ${application.firstName} ${application.lastName}
Phone Number: ${application.phoneNumber}
  `.trim();
}
