const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const laporanRoutes = require('./laporan');
const notificationRoutes = require('./notificationRoutes');
const approvalRoutes = require('./approvalRoutes');
const finalDocumentRoutes = require('./finalDocumentRoutes');
const testRoutes = require('./testRoutes');

// --- Pemasangan Rute API ---
// Semua rute API utama sekarang berada di bawah prefix '/api'

// Auth routes (Mencakup Login/Register, Google OAuth, dan Callback)
router.use('/api/auth', authRoutes); 

// Main API routes
router.use('/api/users', userRoutes);
router.use('/api/laporan', laporanRoutes);
router.use('/api/notifications', notificationRoutes);
router.use('/api/approvals', approvalRoutes);
router.use('/api/finaldoc', finalDocumentRoutes); // Ganti /finaldoc ke /api/finaldoc

// Test/Diagnostics routes (keep last)
router.use('/api/test', testRoutes);
router.use('/api/diag', testRoutes);

// HAPUS RUTE DUPLIKAT:
// router.use('/auth', authRoutes); // Dihapus karena duplikat dengan /api/auth

// HAPUS RUTE NON-API:
// router.use('/finaldoc', finalDocumentRoutes); // Dipindahkan ke /api/finaldoc

module.exports = router;