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
const fs = require('fs');

// Initialize express app
const app = express();

// Security Middleware
// Configure Helmet with adjusted CSP for image loading
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:*"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
            connectSrc: ["'self'", "http://localhost:*"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
        },
    }
}));

// CORS configuration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    next();
});

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

// Add debugging for static file serving
// Ensure static files are properly served with appropriate headers for uploads
app.use('/uploads', (req, res, next) => {
    console.log(`Static file request for: ${req.url}`);
    
    // Set CORS headers
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
        // Aggressive cache busting headers
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    next();
}, express.static(path.join(__dirname, 'public', 'uploads')));

// Make sure to serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public'), { 
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
            // Set cache control headers for images
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
        }
    }
}));

// Special route for accessing profile images directly
app.get('/profileImage/:filename', (req, res) => {
    const filename = req.params.filename;
    console.log(`Direct profile image request for: ${filename}`);
    
    const imagePath = path.join(__dirname, 'public', 'uploads', 'profiles', filename);
    
    // Check if file exists
    if (fs.existsSync(imagePath)) {
        // Set no-cache headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        res.sendFile(imagePath);
    } else {
        console.log(`File not found: ${imagePath}`);
        res.status(404).send('Image not found');
    }
});

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

// Import routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboard');
const settingsRoutes = require('./routes/settingsRoutes');
const profileRoutes = require('./routes/profileRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);

// Make sure to serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend files
app.use(express.static(path.join(__dirname, '..', 'FRONT-END')));

// Handle frontend routes
app.get('/profile/:id', (req, res) => {
    console.log(`Received request for profile with ID: ${req.params.id}`);
    res.sendFile(path.join(__dirname, '..', 'FRONT-END', 'profile.html'));
});

// Catch-all for any other profile routes
app.get('/profile/*', (req, res) => {
    console.log(`Received request for profile path: ${req.originalUrl}`);
    res.sendFile(path.join(__dirname, '..', 'FRONT-END', 'profile.html'));
});

// Add a route to get server info
app.get('/api/server-info', (req, res) => {
    res.json({
        port: 5000,
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

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/coaching_membership');
        console.log('MongoDB connected');
        
        // Force port 5000 instead of finding an available port
        const port = 5000;
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