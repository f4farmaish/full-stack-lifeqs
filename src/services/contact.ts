import { ContactFormData, ContactFormResponse } from "@/types";

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;

export async function sendContactEmail(data: ContactFormData): Promise<ContactFormResponse> {
  try {


    if (!RESEND_API_KEY) {
      console.error('Resend API key is not configured');
      throw new Error('Email service is not configured');
    }

    const emailContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #FFFFFF; background-color: #101012;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1F1F22; border-radius: 10px; background-color: #101012;">
            <h2 style="color: #877EFF; text-align: center;">New Contact Form Submission</h2>
            
            <div style="background-color: #1F1F22; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #FFFFFF;">Contact Details:</h3>
              <p><strong>Name:</strong> ${data.name}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Topic:</strong> ${data.topic}</p>
            </div>
            
            <div style="margin: 20px 0;">
              <h3 style="color: #FFFFFF;">Message:</h3>
              <div style="background-color: #1F1F22; padding: 15px; border: 1px solid #333333; border-radius: 5px; color: #EFEFEF;">
                ${data.message.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <hr style="border: 1px solid #1F1F22; margin: 20px 0;">
            
            <p style="font-size: 12px; color: #7878A3; text-align: center;">
              This email was sent from your website contact form.
            </p>
          </div>
        </body>
      </html>
    `;

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'emna.othmen@gmail.com',
        reply_to: data.email,
        subject: `Contact Form: ${data.topic} - ${data.name}`,
        html: emailContent,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', result);
      throw new Error(result.message || 'Failed to send email');
    }

    
    return {
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.'
    };

  } catch (error) {
    console.error('Error sending contact email:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send message. Please try again later.'
    };
  }
}