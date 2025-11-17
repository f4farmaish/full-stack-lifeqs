"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resend_1 = require("resend");
const config_1 = require("./config");
module.exports = async (context) => {
    const req = context.req;
    const res = context.res;
    const log = context.log;
    const error = context.error;
    try {
        log('Function triggered with payload:', req.body);
        // Handle payload
        let payload = req.body;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            }
            catch (parseError) {
                throw new Error('Failed to parse payload: ' + parseError.message);
            }
        }
        const application = payload?.variables?.document ?? payload;
        if (!application || !application.$id) {
            throw new Error('No application data found in payload');
        }
        log('Application data:', {
            id: application.$id,
            companyName: application.companyName,
            businessEmail: application.businessEmail,
        });
        // Environment variables
        const apiKey = process.env.RESEND_API_KEY;
        const adminEmail = process.env.ADMIN_EMAIL;
        const senderEmail = process.env.SENDER_EMAIL;
        if (!apiKey || !adminEmail || !senderEmail) {
            throw new Error(`Missing required env vars: ${[
                !apiKey && 'RESEND_API_KEY',
                !adminEmail && 'ADMIN_EMAIL',
                !senderEmail && 'SENDER_EMAIL',
            ]
                .filter(Boolean)
                .join(', ')}`);
        }
        // Init Resend client
        const resend = new resend_1.Resend(apiKey);
        // Send email
        const { data, error: sendError } = await resend.emails.send({
            from: senderEmail,
            to: adminEmail,
            subject: 'New Business Account Application',
            text: (0, config_1.getEmailBody)(application),
        });
        if (sendError) {
            throw new Error(`Resend error: ${sendError.message}`);
        }
        log('Email sent successfully:', data?.id);
        return res.json({ success: true });
    }
    catch (err) {
        error('Error sending email:', {
            message: err.message,
            stack: err.stack,
        });
        return res.json({ success: false, error: err.message });
    }
};
