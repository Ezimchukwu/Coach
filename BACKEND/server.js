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
const path = require('path');

// Initialize express app
const app = express();

// Security Middleware
// Configure Helmet with adjusted CSP for image loading
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "data:", "blob:", "http://localhost:*"],
            "default-src": ["'self'", "http://localhost:*"]
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://localhost:5000'],
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
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(compression());

// Serve static files from the uploads directory with CORS headers
app.use('/uploads', (req, res, next) => {
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cross-Origin-Resource-Policy': 'cross-origin'
    });
    next();
}, express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/dashboard', require('./routes/dashboard.js'));
/* 
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/memberships', require('./routes/membershipRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
*/

// Add a route to get server info
app.get('/api/server-info', (req, res) => {
    res.json({
        port: port,
        status: 'running'
    });
});

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

// Function to find an available port
const findAvailablePort = async (startPort) => {
    let port = startPort;
    while (true) {
        try {
            await new Promise((resolve, reject) => {
                const server = app.listen(port)
                    .once('error', () => {
                        port++;
                        server.close();
                        resolve();
                    })
                    .once('listening', () => {
                        server.close();
                        resolve();
                    });
            });
            return port;
        } catch (err) {
            port++;
        }
    }
};

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coaching_membership');
        console.log('MongoDB connected');
        
        const port = await findAvailablePort(process.env.PORT || 5000);
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log(`Server info available at http://localhost:${port}/api/server-info`);
        });

        // Handle unhandled rejections
        process.on('unhandledRejection', (err) => {
            console.error('UNHANDLED REJECTION! 💥 Shutting down...');
            console.error(err);
            server.close(() => {
                process.exit(1);
            });
        });

        // Handle SIGTERM
        process.on('SIGTERM', () => {
            console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
            server.close(() => {
                console.log('💥 Process terminated!');
                mongoose.connection.close(false, () => {
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
};

// Start the server
startServer(); 