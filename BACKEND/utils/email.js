const nodemailer = require('nodemailer');

class Email {
    constructor(user, url, token) {
        this.to = user.email;
        this.firstName = user.firstName;
        this.token = token;
        this.from = `Coaching Membership <${process.env.EMAIL_FROM}>`;
    }

    createTransport() {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async sendPasswordReset() {
        try {
            const mailOptions = {
                from: this.from,
                to: this.to,
                subject: 'Password Reset Code',
                html: `
                    <div style="font-family: Arial; padding: 20px;">
                        <h2>Hello ${this.firstName},</h2>
                        <p>Your 8-digit password reset code is:</p>
                        <h1 style="color: #007bff; text-align: center; letter-spacing: 2px;">${this.token}</h1>
                        <p>This code will expire in 10 minutes.</p>
                    </div>
                `
            };

            await this.createTransport().sendMail(mailOptions);
        } catch (error) {
            console.error('Email error:', error);
            throw error;
        }
    }

    async sendWelcome() {
        await this.send(
            'Welcome to Coaching Membership!',
            'Welcome to our coaching platform! We are excited to have you on board.'
        );
    }

    async sendPasswordChanged() {
        await this.send(
            'Your password has been changed',
            'This is a confirmation that the password for your account has just been changed.'
        );
    }
}

module.exports = Email; 