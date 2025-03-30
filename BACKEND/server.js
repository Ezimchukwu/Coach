require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Initialize express app
const app = express();

// Security Middleware
app.use(helmet()); // Set security HTTP headers
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
    max: 100, // Limit each IP to 100 requests per windowMs
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Test route to verify API is working
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to Coaching Membership API',
        status: 'success',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
/* 
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/memberships', require('./routes/membershipRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
*/

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { error: err, stack: err.stack })
    });
});

// Database connection with retry mechanism
const connectWithRetry = async (retries = 5, interval = 5000) => {
    const dbURI = process.env.MONGODB_URI.replace(
        '/?',
        '/coaching_membership?'
    );

    for (let i = 0; i < retries; i++) {
        try {
            const conn = await mongoose.connect(dbURI, {
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
                dbName: 'coaching_membership',
                writeConcern: {
                    w: 'majority'
                }
            });
            console.log('MongoDB connected successfully');
            console.log(`MongoDB Connected to: ${conn.connection.host}`);
            console.log(`Database Name: ${conn.connection.name}`);
            return true;
        } catch (error) {
            console.error(`Connection attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                console.log(`Retrying in ${interval/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
    }
    return false;
};

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
});

// Start server only after successful database connection
const startServer = async () => {
    try {
        const connected = await connectWithRetry();
        if (!connected) {
            console.error('Failed to connect to MongoDB after multiple retries');
            process.exit(1);
        }

        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            console.log(`API Health check available at http://localhost:${PORT}/api/health`);
        });

        // Handle graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            server.close(() => {
                console.log('Process terminated!');
                mongoose.connection.close(false, () => {
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('Server startup failed:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message, err.stack);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

// Start the server
startServer(); 
