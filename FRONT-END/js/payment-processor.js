// Payment Processor Class
class PaymentProcessor {
    constructor() {
        // Initialize payment gateways
        this.initializeStripe();
        this.initializePayPal();
        this.initializeCrypto();
        this.setupEventListeners();
    }

    // Initialize Stripe
    initializeStripe() {
        this.stripe = Stripe('your_publishable_key'); // Replace with your Stripe publishable key
        this.elements = this.stripe.elements();
        
        // Create card element
        const cardElement = this.elements.create('card', {
            style: {
                base: {
                    fontSize: '16px',
                    color: '#32325d',
                    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
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

        // Mount card element
        cardElement.mount('#card-element');

        // Handle validation errors
        cardElement.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
            }
        });

        this.cardElement = cardElement;
    }

    // Initialize PayPal
    initializePayPal() {
        paypal.Buttons({
            createOrder: (data, actions) => {
                const amount = this.getSelectedPlanPrice();
                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            value: amount
                        }
                    }]
                });
            },
            onApprove: (data, actions) => {
                return actions.order.capture().then((details) => {
                    this.handleSuccessfulPayment('paypal', details);
                });
            }
        }).render('#paypal-button-container');
    }

    // Initialize Crypto payments
    initializeCrypto() {
        // Initialize crypto payment gateway (e.g., Coinbase Commerce)
        if (typeof CoinbaseCommerce !== 'undefined') {
            this.coinbaseCommerce = new CoinbaseCommerce({
                apiKey: 'your_coinbase_api_key' // Replace with your Coinbase Commerce API key
            });
        }
    }

    // Set up event listeners
    setupEventListeners() {
        // Payment method selection
        const paymentMethods = document.querySelectorAll('.payment-method');
        paymentMethods.forEach(method => {
            method.addEventListener('click', () => this.handlePaymentMethodSelection(method));
        });

        // Payment form submission
        const paymentForm = document.getElementById('payment-form');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => this.handleFormSubmission(e));
        }
    }

    // Handle payment method selection
    handlePaymentMethodSelection(method) {
        const paymentForms = document.querySelectorAll('.payment-form');
        paymentForms.forEach(form => form.style.display = 'none');

        const selectedForm = document.getElementById(`${method.dataset.method}-form`);
        if (selectedForm) {
            selectedForm.style.display = 'block';
        }

        // Update active state
        document.querySelectorAll('.payment-method').forEach(btn => {
            btn.classList.remove('active');
        });
        method.classList.add('active');
    }

    // Get selected plan price
    getSelectedPlanPrice() {
        const urlParams = new URLSearchParams(window.location.search);
        const plan = urlParams.get('plan') || 'professional';
        const prices = {
            basic: 49,
            professional: 99,
            enterprise: 199
        };
        return prices[plan] || prices.professional;
    }

    // Process Stripe payment
    async processStripePayment(paymentMethod = 'card') {
        try {
            const { token, error } = await this.stripe.createToken(this.cardElement);
            if (error) {
                throw new Error(error.message);
            }

            const response = await this.processPayment('stripe', {
                token: token.id,
                amount: this.getSelectedPlanPrice()
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    // Process bank transfer
    async processBankTransfer(formData) {
        try {
            const response = await this.processPayment('bank', {
                accountName: formData.accountName,
                accountNumber: formData.accountNumber,
                bankName: formData.bankName,
                amount: this.getSelectedPlanPrice()
            });

            return response;
        } catch (error) {
            throw error;
        }
    }

    // Process crypto payment
    async processCryptoPayment() {
        try {
            const charge = await this.coinbaseCommerce.createCharge({
                name: 'CoachPro Membership',
                description: 'Membership Payment',
                local_price: {
                    amount: this.getSelectedPlanPrice(),
                    currency: 'USD'
                },
                pricing_type: 'fixed_price'
            });

            return charge;
        } catch (error) {
            throw error;
        }
    }

    // Generic payment processing
    async processPayment(method, data) {
        try {
            const response = await fetch('/api/process-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    method,
                    ...data,
                    plan: new URLSearchParams(window.location.search).get('plan') || 'professional'
                })
            });

            if (!response.ok) {
                throw new Error('Payment failed');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Handle successful payment
    handleSuccessfulPayment(method, details) {
        const plan = new URLSearchParams(window.location.search).get('plan') || 'professional';
        window.location.href = `success.html?plan=${plan}&ref=${details.id}`;
    }

    // Handle form submission
    async handleFormSubmission(event) {
        event.preventDefault();
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

        try {
            const formData = new FormData(event.target);
            const paymentMethod = formData.get('payment-method');

            let result;
            switch (paymentMethod) {
                case 'stripe':
                    result = await this.processStripePayment();
                    break;
                case 'bank':
                    result = await this.processBankTransfer(Object.fromEntries(formData));
                    break;
                case 'crypto':
                    result = await this.processCryptoPayment();
                    break;
                default:
                    throw new Error('Invalid payment method');
            }

            this.handleSuccessfulPayment(paymentMethod, result);
        } catch (error) {
            const errorElement = document.getElementById('payment-errors');
            errorElement.textContent = error.message;
            errorElement.style.display = 'block';
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }
}

// Initialize payment processor
const paymentProcessor = new PaymentProcessor();

// Export for use in other files
export default paymentProcessor; 