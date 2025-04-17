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
const passport = require('passport');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'public', 'uploads');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Initialize express app
const app = express();

// Initialize Passport
app.use(passport.initialize());

// Create required directories
const uploadDirs = [
    path.join(__dirname, 'public'),
    path.join(__dirname, 'public', 'uploads'),
    path.join(__dirname, 'public', 'uploads', 'profiles')
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`Created directory: ${dir}`);
        } catch (err) {
            console.error(`Error creating directory ${dir}:`, err);
        }
    }
});

// Security Middleware with updated CSP for image serving
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "http://127.0.0.1:*", "*"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
            connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
        },
    }
}));

// CORS configuration
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:5000', 'http://127.0.0.1:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['set-cookie']
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

// Serve static files from public directory with proper headers
app.use('/uploads', (req, res, next) => {
    // Log the request
    console.log('Static file request:', {
        url: req.url,
        path: path.join(__dirname, 'public', 'uploads', req.url)
    });
    
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    next();
}, express.static(path.join(__dirname, 'public', 'uploads'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif')) {
            res.set({
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
        }
    }
}));

// Serve the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Special route for profile images
app.get('/uploads/profiles/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, 'public', 'uploads', 'profiles', filename);
    
    console.log('Profile image request:', {
        filename,
        path: imagePath,
        exists: fs.existsSync(imagePath)
    });
    
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        res.status(404).json({
            error: 'Image not found',
            path: imagePath
        });
    }
});

// Debug route for checking image paths
app.get('/debug/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const possiblePaths = [
        path.join(__dirname, 'public', 'uploads', 'profiles', filename),
        path.join(__dirname, 'public', 'uploads', filename)
    ];
    
    console.log('Debugging image request:', {
        filename,
        paths: possiblePaths,
        exists: possiblePaths.map(p => fs.existsSync(p))
    });
    
    const existingPath = possiblePaths.find(p => fs.existsSync(p));
    if (existingPath) {
        res.sendFile(existingPath);
    } else {
        res.status(404).json({
            error: 'Image not found',
            checkedPaths: possiblePaths
        });
    }
});

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
const newsletterRoutes = require('./routes/newsletterRoutes');
const contactRoutes = require('./routes/contactRoutes');
const socialAuthRoutes = require('./routes/socialAuth');

// Mount routes
app.use('/api/auth', socialAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/contact', contactRoutes);

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