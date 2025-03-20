import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

export const sendWelcomeEmail = async (email, name) => {
  console.log('Attempting to send welcome email to:', email);
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Your AI Coach!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to Your AI Coach!</h2>
          <p>Dear ${name},</p>
          <p>Thank you for joining Your AI Coach. We're excited to have you on board!</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,</p>
          <p>Your AI Coach Team</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
}; 