const express = require('express');
const helmet = require('helmet');
const { connectDB } = require('./config/dbConnection');
const dotenv = require('dotenv').config();
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('./config/passport');  
const errorHandler = require('./middleware/errorHandler');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 5001;
const VERCEL_HOST = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';

// --- KONFIGURASI CORS DENGAN WHITELIST DOMAIN ---
const whitelist = [
  'https://paw-solinum.netlify.app', // DOMAIN FRONTEND NETLIFY (HTTPS Wajib!)
  VERCEL_HOST, // DOMAIN BACKEND VERCEL
  'http://localhost:3000', // Port frontend lokal
  'http://localhost:3001', 
  'http://localhost:5001'  // Port backend lokal
];

const corsOptions = {
  // Fungsi untuk memeriksa apakah origin yang meminta ada di whitelist
  origin: (origin, callback) => {
    // Izinkan jika origin ada di whitelist, atau jika origin tidak ada (misalnya, permintaan non-browser/localhost)
    if (whitelist.includes(origin) || !origin) {
      callback(null, true);
    } else {
    console.error(`CORS BLOCKED: Origin ${origin} not in whitelist. Whitelist: ${whitelist.join(', ')}`);
      callback(new Error(`Not allowed by CORS for origin: ${origin}`));
    }
  },
  // Wajib untuk mengirim cookies/session dari domain yang berbeda (Netlify ke Vercel)
  credentials: true, 
  optionsSuccessStatus: 200 
};

// Terapkan CORS sebelum middleware lainnya
app.use(cors(corsOptions));
// Handle preflight requests (OPTIONS method) secara eksplisit
app.options('/', cors(corsOptions)); // <--- PENANGANAN OPTIONS Wajib untuk Lintas Domain!

// ----------------------------------------------------


// Koneksi database (async untuk Vercel)
connectDB().catch(err => {
  console.error('Database connection failed:', err.message);
});

// Session configuration
if (!process.env.SESSION_SECRET) {
  console.error('ERROR: SESSION_SECRET is required in environment variables');
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Wajib: Secure=true di produksi (HTTPS)
    // Diatur true secara default karena SameSite=None memerlukan koneksi aman
    secure: process.env.NODE_ENV === 'production' || true, 
    // Wajib untuk komunikasi lintas domain (CORS)
    sameSite: 'none', 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (_,res) => res.send('OK - finaldoc branch'));


// Security & Middleware
// Note: CORS sudah diterapkan di atas
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  frameguard: false 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

// ================== ROUTES ==================
const routes = require('./routes');
app.use('/', routes);

// ================== ERROR HANDLER ==================
app.use(errorHandler);

// Cek variabel lingkungan yang diperlukan (warning only di serverless)
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'EMAIL_USER',
  'EMAIL_PASS',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SESSION_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`Missing required environment variable: ${varName}`);
  }
});

// Start server (hanya untuk local development)
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port: ${port}`);
  });
}

// Export untuk Vercel serverless
module.exports = app;