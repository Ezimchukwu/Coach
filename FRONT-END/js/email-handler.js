// Email Template Handler
class EmailHandler {
    constructor() {
        this.templates = {
            payment: document.querySelector('#payment-template').innerHTML,
            welcome: document.querySelector('#welcome-template').innerHTML
        };
    }

    // Replace template placeholders with actual values
    replacePlaceholders(template, data) {
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        return template
            .replace('[First Name]', data.firstName)
            .replace('[Order ID]', data.orderId)
            .replace('[Plan Name]', data.planName)
            .replace('[Amount]', data.amount)
            .replace('[Payment Method]', data.paymentMethod)
            .replace('[Payment Date]', data.paymentDate)
            .replace('[Next Billing Date]', nextBillingDate.toLocaleDateString())
            .replace('[Email Address]', data.email)
            .replace('[Start Date]', data.startDate)
            .replace('[Login URL]', data.loginUrl)
            .replace('[Dashboard URL]', data.dashboardUrl)
            // Add plan-specific benefits
            .replace(/\[Plan Benefits\]/g, this.getPlanBenefits(data.planName))
            // Add upcoming events based on plan
            .replace(/\[Upcoming Events\]/g, this.getUpcomingEvents(data.planName));
    }

    // Get plan-specific benefits
    getPlanBenefits(planName) {
        const benefits = {
            'Basic': [
                'Access to basic content library',
                'Monthly group sessions',
                'Community forum access',
                'Email support'
            ],
            'Professional': [
                'Full content library access',
                'Weekly group sessions',
                'Priority community access',
                '1 monthly private session',
                'Priority email support',
                'Mobile app access'
            ],
            'Enterprise': [
                'VIP content library access',
                'Unlimited group sessions',
                '4 monthly private sessions',
                'Custom learning path',
                '24/7 priority support',
                'Advanced analytics'
            ]
        };
        return benefits[planName] || benefits['Professional'];
    }

    // Get upcoming events based on plan
    getUpcomingEvents(planName) {
        const events = {
            'Basic': [
                'Monthly Networking - Last Friday',
                'Group Coaching - First Monday',
                'Q&A Session - Second Wednesday'
            ],
            'Professional': [
                'Weekly Goal Setting - Every Monday',
                'Leadership Masterclass - Every Wednesday',
                'Networking Session - Every Friday',
                'Expert Talk Series - Bi-weekly'
            ],
            'Enterprise': [
                'VIP Strategy Session - Every Monday',
                'Executive Masterclass - Every Wednesday',
                'Elite Networking - Every Friday',
                'Industry Expert Roundtable - Weekly',
                'Private Mentoring - On Demand'
            ]
        };
        return events[planName] || events['Professional'];
    }

    // Send payment confirmation email
    async sendPaymentConfirmation(userData) {
        try {
            const emailContent = this.replacePlaceholders(this.templates.payment, userData);
            
            // Example API call to your email service
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: userData.email,
                    subject: 'Welcome to CoachPro - Payment Confirmation',
                    html: emailContent,
                    from: {
                        name: 'CoachPro Team',
                        email: 'noreply@coachpro.com'
                    },
                    replyTo: 'support@coachpro.com',
                    attachments: [
                        {
                            filename: 'receipt.pdf',
                            content: await this.generateReceipt(userData)
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send payment confirmation email');
            }

            return true;
        } catch (error) {
            console.error('Error sending payment confirmation:', error);
            return false;
        }
    }

    // Generate PDF receipt
    async generateReceipt(userData) {
        // Implementation for generating PDF receipt
        // This would typically use a PDF generation library
        return 'PDF_CONTENT';
    }

    // Send welcome email
    async sendWelcomeEmail(userData) {
        try {
            const emailContent = this.replacePlaceholders(this.templates.welcome, userData);
            
            // Example API call to your email service
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: userData.email,
                    subject: 'Welcome to CoachPro - Let\'s Begin Your Journey!',
                    html: emailContent,
                    from: {
                        name: 'CoachPro Team',
                        email: 'noreply@coachpro.com'
                    },
                    replyTo: 'support@coachpro.com',
                    attachments: [
                        {
                            filename: 'getting-started-guide.pdf',
                            content: await this.generateWelcomeGuide(userData)
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send welcome email');
            }

            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return false;
        }
    }

    // Generate welcome guide PDF
    async generateWelcomeGuide(userData) {
        // Implementation for generating welcome guide PDF
        // This would typically use a PDF generation library
        return 'PDF_CONTENT';
    }

    // Example usage after successful payment
    async handleSuccessfulPayment(paymentData) {
        const userData = {
            firstName: paymentData.customer.firstName,
            email: paymentData.customer.email,
            orderId: paymentData.orderId,
            planName: paymentData.planName,
            amount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            paymentDate: new Date().toLocaleDateString(),
            startDate: new Date().toLocaleDateString(),
            loginUrl: 'https://coachpro.com/login',
            dashboardUrl: 'https://coachpro.com/dashboard'
        };

        // Send both emails with a slight delay between them
        await this.sendPaymentConfirmation(userData);
        // Wait 5 minutes before sending welcome email
        setTimeout(async () => {
            await this.sendWelcomeEmail(userData);
        }, 5 * 60 * 1000);

        // Track email sending in analytics
        this.trackEmailSending(userData);
    }

    // Track email sending in analytics
    trackEmailSending(userData) {
        try {
            fetch('/api/analytics/track-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userData.email,
                    event: 'welcome_emails_sent',
                    planName: userData.planName,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error tracking email analytics:', error);
        }
    }
}

// Initialize email handler
const emailHandler = new EmailHandler();

// Export for use in other files
export default emailHandler; 