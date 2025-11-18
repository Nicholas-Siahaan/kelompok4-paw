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

// --- KONFIGURASI CORS DENGAN LOGIKA REGEX DINAMIS ---
// Gunakan variabel lingkungan sebagai fallbacks
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'https://paw-solinum.netlify.app';
const VERCEL_HOST = process.env.VERCEL_URL; // e.g., 'paw-solinum-xxxx.vercel.app'

// Buat Regular Expression yang fleksibel untuk mencocokkan Netlify dan Vercel
const allowedOriginsRegex = new RegExp(`(https?:\/\/)?(${FRONTEND_ORIGIN.replace(/https?:\/\//, '')}|${VERCEL_HOST ? VERCEL_HOST.replace(/https?:\/\//, '') : ''}|localhost:\d{4})`);

const corsOptions = {
  // Origin akan diizinkan jika cocok dengan Regex, atau jika permintaan non-browser (!origin)
  origin: (origin, callback) => {
    // Izinkan jika origin tidak ada (misalnya, permintaan internal/localhost)
    if (!origin) return callback(null, true);

    // Tes Regex
    if (allowedOriginsRegex.test(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS BLOCKED: Origin ${origin} not matched by regex.`);
      callback(new Error(`Not allowed by CORS for origin: ${origin}`));
    }
  },
  // Wajib untuk mengirim cookies/session dari domain yang berbeda
  credentials: true, 
  optionsSuccessStatus: 200 
};

// Terapkan CORS sebelum middleware lainnya
app.use(cors(corsOptions));
// PENTING: HAPUS app.options('/')! app.use(cors) akan menangani OPTIONS
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