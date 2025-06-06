import nodemailer from 'nodemailer';

/**
 * Create a nodemailer transporter specifically configured for Gmail
 */
const createTransporter = async () => {
    // Gmail SMTP configuration
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            // Do not fail on invalid certificates
            rejectUnauthorized: false
        }
    });
};

/**
 * Generate a random OTP
 * @param {number} length - Length of OTP
 * @returns {string} - Generated OTP
 */
export const generateOTP = (length = 6) => {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
};

/**
 * Send OTP email for verification
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 * @param {string} name - Recipient name
 * @returns {Promise<boolean>} - Success status
 */
export const sendOTPEmail = async (email, otp, name) => {
    try {
        console.log(`Attempting to send OTP email to ${email}`);
        
        const transporter = await createTransporter();
        
        // Log email configuration (without password)
        console.log(`Using email configuration: ${process.env.EMAIL_USER}, SMTP: smtp.gmail.com`);
        
        const mailOptions = {
            from: `"The KGPian Game Theory Society" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #333;">Hello ${name || 'there'}!</h2>
                    <p>Thank you for signing up at the KGPian Game Theory Society! To complete your registration, please enter the following verification code:</p>
                    <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                    <p>Best regards,<br>KGTS Team</p>
                </div>
            `,
            // Add text version for better deliverability
            text: `Hello ${name || 'there'}! Your verification code is: ${otp}. This code is valid for 10 minutes.`
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('ERROR SENDING EMAIL:', error);
        
        // Log detailed error information for troubleshooting
        if (error.response) {
            console.error('SMTP ERROR RESPONSE:', error.response);
        }
        
        return false;
    }
};

/**
 * Send welcome email after successful registration
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @returns {Promise<boolean>} - Success status
 */
export const sendWelcomeEmail = async (email, name) => {
    try {
        console.log(`Attempting to send welcome email to ${email}`);
        
        const transporter = await createTransporter();
        
        const mailOptions = {
            from: `"The KGPian Game Theory Society" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to the KGPian Game Theory Society!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #333;">Welcome, ${name || 'there'}!</h2>
                    <p>Thank you for joining our platform. We're excited to have you as part of our community!</p>
                    <p>You can now explore various Games and Riddles on our platform.</p>
                    <p>If you have any questions or need assistance, feel free to contact us.</p>
                    <p>Best regards,<br>KGTS Team</p>
                </div>
            `,
            // Add text version for better deliverability
            text: `Welcome, ${name || 'there'}! Thank you for joining our platform. You can now explore various events and blogs on our platform.`
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
}; 

/**
 * Send OTP email for verification
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 * @returns {Promise<boolean>} - Success status
 */
export const sendResetPasswordOTPEmail = async (email, otp) => {
    try {
        console.log(`Attempting to send OTP email to ${email}`);
        
        const transporter = await createTransporter();
        
        // Log email configuration (without password)
        console.log(`Using email configuration: ${process.env.EMAIL_USER}, SMTP: smtp.gmail.com`);
        
        const mailOptions = {
            from: `"The KGPian Game Theory Society" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification Code for Password Reset',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                
                    <p>To reset your password, please enter the following verification code:</p>
                    <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                    <p>Best regards,<br>KGTS Team</p>
                </div>
            `,
            // Add text version for better deliverability
            text: `Your verification code is: ${otp}. This code is valid for 10 minutes.`
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('ERROR SENDING EMAIL:', error);
        
        // Log detailed error information for troubleshooting
        if (error.response) {
            console.error('SMTP ERROR RESPONSE:', error.response);
        }
        
        return false;
    }
};

/**
 * Send OTP email for verification
 * @param {string} email - Recipient email
 * @param {string} otp - OTP to send
 * @param {string} name - Recipient name
 * @returns {Promise<boolean>} - Success status
 */
export const sendKGPOTPEmail = async (email, otp, name) => {
    try {
        console.log(`Attempting to send OTP email to ${email}`);
        
        const transporter = await createTransporter();
        
        // Log email configuration (without password)
        console.log(`Using email configuration: ${process.env.EMAIL_USER}, SMTP: smtp.gmail.com`);
        
        const mailOptions = {
            from: `"The KGPian Game Theory Society" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Institute Email Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                    <h2 style="color: #333;">Hello ${name || 'there'}!</h2>
                    <p>Thank you for signing up at the KGPian Game Theory Society! To verify your institute ID, please enter the following verification code:</p>
                    <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                        ${otp}
                    </div>
                    <p>This code is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                    <p>Best regards,<br>KGTS Team</p>
                </div>
            `,
            // Add text version for better deliverability
            text: `Hello ${name || 'there'}! Your verification code is: ${otp}. This code is valid for 10 minutes.`
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        return true;
    } catch (error) {
        console.error('ERROR SENDING EMAIL:', error);
        
        // Log detailed error information for troubleshooting
        if (error.response) {
            console.error('SMTP ERROR RESPONSE:', error.response);
        }
        
        return false;
    }
};