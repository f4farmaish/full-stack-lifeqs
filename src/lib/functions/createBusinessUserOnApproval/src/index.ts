import { Client, Databases, ID, Users, Account } from "node-appwrite";
import { Resend } from "resend";
import { getEmailBody } from "./config";

// Main function executed by Appwrite
module.exports = async (context: any) => {
  const req = context.req;
  const res = context.res;
  const log = context.log;
  const error = context.error;

  try {
    log("Function triggered with payload:", JSON.stringify(req.body));

    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (parseError) {
        throw new Error(
          "Failed to parse payload: " + (parseError as Error).message
        );
      }
    } else if (typeof payload !== "object" || payload === null) {
      throw new Error("Invalid payload: Expected object or JSON string");
    }

    const application = payload?.variables?.document ?? payload;
    if (!application || !application.$id) {
      throw new Error("No application data found in payload");
    }

    if (application.status !== "approved") {
      log("Status is not approved, skipping:", application.$id);
      return res.json({ success: true, message: "Status not approved" });
    }

    log(
      "Application approved:",
      application.$id,
      application.companyName,
      application.businessEmail
    );

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL;
    const appwriteEndpoint = process.env.APPWRITE_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const appwriteApiKey = process.env.APPWRITE_FUNCTION_API_KEY;
    const verificationUrl = process.env.VERIFICATION_URL;

    if (
      !resendApiKey ||
      !senderEmail ||
      !appwriteEndpoint ||
      !projectId ||
      !appwriteApiKey ||
      !verificationUrl
    ) {
      const missingVars = [
        !resendApiKey && "RESEND_API_KEY",
        !senderEmail && "SENDER_EMAIL",
        !appwriteEndpoint && "APPWRITE_ENDPOINT",
        !projectId && "APPWRITE_FUNCTION_PROJECT_ID",
        !appwriteApiKey && "APPWRITE_FUNCTION_API_KEY",
        !verificationUrl && "VERIFICATION_URL",
      ]
        .filter(Boolean)
        .join(", ");
      throw new Error(`Missing required environment variables: ${missingVars}`);
    }

    const client = new Client();
    client
      .setEndpoint(appwriteEndpoint)
      .setProject(projectId)
      .setKey(appwriteApiKey);

    const databases = new Databases(client);
    const users = new Users(client);

    const crypto = require("crypto");
    const tempPassword = crypto.randomBytes(8).toString("hex");

    log("Creating user with parameters:", {
      userId: "unique",
      email: application.businessEmail,
      phone: undefined,
      password: "****",
      name: `${application.firstName} ${application.lastName}`,
    });

    const user = await users.create(
      ID.unique(),
      application.businessEmail,
      undefined,
      tempPassword,
      `${application.firstName} ${application.lastName}`
    );

    log("User created:", user.$id);

    // Send verification email
    try {
      const session = await users.createSession(user.$id);
      log("Session created for user:", user.$id);

      const sessionClient = new Client();
      sessionClient
        .setEndpoint(appwriteEndpoint)
        .setProject(projectId)
        .setSession(session.secret);

      const account = new Account(sessionClient);
      await account.createVerification(verificationUrl);
      log("Verification email requested for user:", user.$id);
    } catch (err: any) {
      error("Failed to request verification email:", {
        message: err.message,
        stack: err.stack,
        code: err.code,
      });
    }

    const userDocument = {
      accountId: user.$id,
      name: `${application.firstName} ${application.lastName}`,
      email: application.businessEmail,
      isBusiness: true,
      bio: "",
      imageId: "",
      dateOfBirth: null,
      point: 0,
      lastBirthdayBonusAwarded: null,
      specialBonusesAwarded: [],
      lastQuestionReset: "",
      questionsAskedToday: 0,
      level: 1,
      isOnline: false,
      lastActive: new Date().toISOString(),
      greatsToday: 0,
      activatedTest: [],
    };

    await databases.createDocument(
      process.env.VITE_APPWRITE_DATABASE_ID!, // Database ID correct
      process.env.VITE_APPWRITE_USER_COLLECTION_ID!, // Users collection ID correct
      user.$id,
      userDocument
    );

    log("User document created:", user.$id);

    // ---------------- Resend Email ----------------
    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: senderEmail,
        to: application.businessEmail,
        subject: "Your Business Account Has Been Approved",
        text: getEmailBody(application.businessEmail, tempPassword),
      });
      log(
        "Credentials email sent via Resend successfully for application:",
        application.$id
      );
    } catch (err: any) {
      error("Failed to send credentials email via Resend:", {
        message: err.message,
        stack: err.stack,
        code: err.code,
      });
    }

    return res.json({ success: true });
  } catch (err: any) {
    error("Error in function:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
    return res.json({ success: false, error: err.message });
  }
};
