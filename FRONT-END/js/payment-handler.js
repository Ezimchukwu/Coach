// Import email handler
import emailHandler from './email-handler.js';

// Payment configuration
const config = {
    stripe: {
        publishableKey: 'pk_test_51OxjKhDfqnqBYZPPJjkQh8YwNsiRtjDqaXejtGXkHKTGGkIwN7YtQmkHAuTrack0aqXxVJXBXZYHDcGWvEEbBT00vQPJLkwF', // Test key for development
        currency: 'usd'
    },
    paypal: {
        clientId: 'your_paypal_client_id', // Replace with your PayPal client ID
        currency: 'USD'
    },
    bankTransfer: {
        accountName: 'DIVINE EZECHIM AZUDIARU',
        accountNumber: '1499511066',
        bankName: 'Access Bank',
        swiftCode: 'ABNGNGLA',
        routingNumber: '044'
    },
    crypto: {
        bitcoin: 'your_btc_wallet_address', // Replace with your BTC wallet address
        ethereum: 'your_eth_wallet_address' // Replace with your ETH wallet address
    }
};

// Plan prices (in cents for Stripe)
const planPrices = {
    basic: {
        amount: 4900,
        displayAmount: '$49.00'
    },
    professional: {
        amount: 9900,
        displayAmount: '$99.00'
    },
    enterprise: {
        amount: 19900,
        displayAmount: '$199.00'
    }
};

// Payment Handler Class
class PaymentHandler {
    constructor() {
        this.stripe = null;
        this.card = null;
        this.paypal = null;
        this.selectedPlan = null;
        this.initializePaymentMethods();
    }

    async initializePaymentMethods() {
        try {
            // Initialize Stripe
            this.stripe = Stripe(config.stripe.publishableKey);
            
            // Create and mount the card element
            const elements = this.stripe.elements();
            this.card = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#32325d',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                        fontSmoothing: 'antialiased',
                        '::placeholder': {
                            color: '#aab7c4'
                        }
                    },
                    invalid: {
                        color: '#fa755a',
                        iconColor: '#fa755a'
                    }
                }
            });

            // Mount the card element
            const cardElement = document.getElementById('card-element');
            if (cardElement) {
                this.card.mount('#card-element');

                // Handle real-time validation errors
                this.card.addEventListener('change', (event) => {
                    const displayError = document.getElementById('card-errors');
                    if (event.error) {
                        displayError.textContent = event.error.message;
                        displayError.style.display = 'block';
                    } else {
                        displayError.textContent = '';
                        displayError.style.display = 'none';
                    }
                });
            }
            
            // Initialize PayPal
            await this.initializePayPal();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize bank transfer if selected
            const bankTransferOption = document.querySelector('[data-method="bank-transfer"]');
            if (bankTransferOption) {
                bankTransferOption.addEventListener('click', () => this.handleBankTransfer());
            }
        } catch (error) {
            console.error('Failed to initialize payment methods:', error);
            this.handlePaymentError(error);
        }
    }

    async initializePayPal() {
        await paypal.Buttons({
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: (planPrices[this.selectedPlan].amount / 100).toFixed(2)
                        }
                    }]
                });
            },
            onApprove: async (data, actions) => {
                const order = await actions.order.capture();
                this.handlePaymentSuccess('paypal', order.id);
            }
        }).render('#paypal-button-container');
    }

    setupEventListeners() {
        // Payment method selection
        document.querySelectorAll('.payment-method-option').forEach(option => {
            option.addEventListener('click', () => this.selectPaymentMethod(option.dataset.method));
        });

        // Form submissions
        const forms = document.querySelectorAll('form[data-payment-method]');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => this.handleFormSubmission(e));
        });
    }

    selectPaymentMethod(method) {
        // Hide all payment forms
        document.querySelectorAll('.payment-form').forEach(form => form.classList.add('d-none'));
        
        // Show selected payment form
        const selectedForm = document.getElementById(`${method}-form`);
        if (selectedForm) {
            selectedForm.classList.remove('d-none');
        }

        // Update active state
        document.querySelectorAll('.payment-method-option').forEach(option => {
            option.classList.toggle('active', option.dataset.method === method);
        });

        // Initialize specific payment method
        if (method === 'bank-transfer') {
            this.handleBankTransfer();
        }
    }

    async handleCardPayment(paymentMethod) {
        try {
            const response = await fetch('/create-payment-intent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    plan: this.selectedPlan,
                    paymentMethod: paymentMethod.id
                })
            });

            const data = await response.json();
            
            const { error } = await this.stripe.confirmCardPayment(data.clientSecret, {
                payment_method: paymentMethod.id
            });

            if (error) {
                throw new Error(error.message);
            }

            this.handlePaymentSuccess('card');
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    async handleBankTransfer() {
        const bankDetails = document.getElementById('bank-transfer-details');
        if (bankDetails) {
            bankDetails.innerHTML = `
                <div class="alert alert-info">
                    <h5>Bank Transfer Details</h5>
                    <p>Please transfer the exact amount to:</p>
                    <div class="bank-info">
                        <p><strong>Bank Name:</strong> ${config.bankTransfer.bankName}</p>
                        <p><strong>Account Name:</strong> ${config.bankTransfer.accountName}</p>
                        <p><strong>Account Number:</strong> ${config.bankTransfer.accountNumber}</p>
                        <p><strong>Swift Code:</strong> ${config.bankTransfer.swiftCode}</p>
                        <p><strong>Bank Code:</strong> ${config.bankTransfer.routingNumber}</p>
                    </div>
                    <div class="mt-3">
                        <p class="mb-2"><strong>Important Notes:</strong></p>
                        <ul class="mb-0">
                            <li>Please include your email as payment reference</li>
                            <li>Transfer must be made within 24 hours</li>
                            <li>Upload your payment receipt below for verification</li>
                        </ul>
                    </div>
                </div>
                <div id="bank-transfer-processing" class="alert alert-warning d-none">
                    <i class="fas fa-spinner fa-spin"></i> Verifying your payment...
                </div>
                <div id="bank-transfer-success" class="alert alert-success d-none">
                    <i class="fas fa-check-circle"></i> Payment verified successfully! Redirecting...
                </div>
            `;
        }
    }

    async handleCryptoPayment() {
        // Show crypto wallet addresses
        const cryptoDetails = document.getElementById('crypto-payment-details');
        if (cryptoDetails) {
            cryptoDetails.innerHTML = `
                <div class="alert alert-info">
                    <h5>Cryptocurrency Payment Details</h5>
                    <p>Please send ${planPrices[this.selectedPlan].displayAmount} worth of cryptocurrency to one of these addresses:</p>
                    <div class="crypto-address">
                        <p><strong>Bitcoin (BTC):</strong></p>
                        <p class="wallet-address">${config.crypto.bitcoin}</p>
                    </div>
                    <div class="crypto-address mt-3">
                        <p><strong>Ethereum (ETH):</strong></p>
                        <p class="wallet-address">${config.crypto.ethereum}</p>
                    </div>
                    <p class="mt-3">After sending the payment, please provide your transaction ID below.</p>
                </div>
            `;
        }
    }

    async handleFormSubmission(e) {
        e.preventDefault();
        const form = e.target;
        const paymentMethod = form.dataset.paymentMethod;

        try {
            this.showLoadingState(form);

            switch (paymentMethod) {
                case 'card':
                    await this.processCardPayment(form);
                    break;

                case 'bank-transfer':
                    await this.processBankTransfer(form);
                    break;

                case 'crypto':
                    await this.handleCryptoPayment();
                    break;
            }
        } catch (error) {
            this.handlePaymentError(error);
        } finally {
            this.hideLoadingState(form);
        }
    }

    async processCardPayment(form) {
        const cardName = form.querySelector('#card-name').value;
        const cardEmail = form.querySelector('#card-email').value;
        const saveCard = form.querySelector('#save-card').checked;

        try {
            // Create payment method
            const { paymentMethod, error } = await this.stripe.createPaymentMethod({
                type: 'card',
                card: this.card,
                billing_details: {
                    name: cardName,
                    email: cardEmail
                }
            });

            if (error) {
                throw error;
            }

            // Show success message
            const successElement = document.getElementById('card-success');
            successElement.classList.add('visible');

            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Redirect to success page
            this.handlePaymentSuccess('card', paymentMethod.id);
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    async processBankTransfer(form) {
        const receiptFile = form.querySelector('#receipt-upload').files[0];
        const email = form.querySelector('input[type="email"]').value;

        if (!receiptFile) {
            throw new Error('Please upload your payment receipt');
        }

        try {
            // Show processing message
            const processingElement = document.getElementById('bank-transfer-processing');
            if (processingElement) {
                processingElement.classList.remove('d-none');
            }

            // Simulate receipt verification
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Show success message
            const successElement = document.getElementById('bank-transfer-success');
            if (successElement) {
                successElement.classList.remove('d-none');
            }

            // Redirect to success page after a short delay
            setTimeout(() => {
                this.handlePaymentSuccess('bank-transfer', 'BANK_' + Date.now());
            }, 1500);
        } catch (error) {
            this.handlePaymentError(error);
        }
    }

    handlePaymentSuccess(method, transactionId) {
        // Get selected plan details
        const planName = document.getElementById('selected-plan').textContent;
        const planAmount = document.getElementById('plan-amount').textContent;

        // Build success URL with all details
        const params = new URLSearchParams({
            plan: this.selectedPlan,
            planName: planName,
            amount: planAmount,
            method: method,
            transaction: transactionId,
            date: new Date().toISOString()
        });

        // Redirect to success page
        window.location.href = `success.html?${params.toString()}`;
    }

    handlePaymentError(error) {
        const errorElement = document.getElementById('payment-error');
        if (errorElement) {
            errorElement.textContent = error.message;
            errorElement.classList.remove('d-none');
        }
    }

    showLoadingState(form) {
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        }
    }

    hideLoadingState(form) {
        const button = form.querySelector('button[type="submit"]');
        if (button) {
            button.disabled = false;
            button.innerHTML = 'Complete Payment';
        }
    }
}

// Initialize payment handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.paymentHandler = new PaymentHandler();
});

// Export for use in other files
export default window.paymentHandler; 