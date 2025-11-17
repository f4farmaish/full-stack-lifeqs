export function getEmailBody(application: any): string {
  return `
A new business account application has been submitted:

Company Name: ${application.companyName}
Registration Number: ${application.registrationNumber}
Business Email: ${application.businessEmail}
Contact Person: ${application.firstName} ${application.lastName}
Phone Number: ${application.phoneNumber}
  `.trim();
}