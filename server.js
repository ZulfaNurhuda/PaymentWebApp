const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser'); // Untuk cookie
const { hashPassword, loadPassword, checkExpiry, logPasswordInfo } = require('./managers/password_managers'); // Impor dari password_utils.js
const db = require('./managers/database_managers'); // Impor dari database_managers.js

const app = express();
const PORT = 1742;

// Load credentials dari file credentials
require('dotenv').config(`${process.cwd()}/.env`);

// Kredensial untuk Google Sheets API
const credentials = {
    email: process.env.CLIENT_EMAIL, // Ganti dengan email service account
    key: process.env.PRIVATE_KEY, // Ganti dengan private key
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
};
const spreadsheetId = process.env.SPREADSHEET_ID; // Ganti dengan ID spreadsheet

let sheets;
let passwordData; // Variabel untuk menyimpan data password dari google sheets

(async () => {
    sheets = await db.connectSheets(credentials);
    console.log("🔅 Connected to Google Sheets API");

    // Muat password saat server mulai
    passwordData = await loadPassword(sheets, spreadsheetId);
    logPasswordInfo(passwordData); // Log informasi password

    // Middleware untuk parse cookie
    app.use(cookieParser());

    // Middleware untuk serve file statis dari folder src/main dan src/security
    app.use('/main', express.static(path.join(__dirname, 'src', 'main')));
    app.use('/security', express.static(path.join(__dirname, 'src', 'security')));

    // Middleware untuk parse JSON
    app.use(express.json());

    // Middleware untuk pengecekan login berdasarkan cookie hash password
    async function checkLogin(req, res, next) {
        const encryptedStatus = await db.encryptedStatus(sheets, spreadsheetId); // Ambil status Encrypted
        const cookies = req.cookies || {};
        const storedHash = cookies.passwordHash;

        if (encryptedStatus) {
            if (storedHash) {
                const currentHash = hashPassword(passwordData.password); // Hash password saat ini
                if (storedHash === currentHash) {
                    next(); // Jika hash cocok, lanjutkan ke /main
                } else {
                    res.clearCookie('passwordHash'); // Jika hash tidak cocok, hapus cookie
                    res.redirect('/security'); // Redirect ke /security
                }
            } else {
                res.redirect('/security'); // Jika tidak ada cookie, redirect ke /security
            }
        } else {
            if (storedHash) {
                res.clearCookie('passwordHash'); // Hapus cookie jika sudah login
                next(); // Jika sudah login, lanjutkan ke /main
            } else {
                next(); // Langsung lanjutkan ke /main tanpa validasi
            }
        }
    }


    // Middleware untuk memastikan belum login (untuk /security)
    async function checkNotLoggedIn(req, res, next) {
        const encryptedStatus = await db.encryptedStatus(sheets, spreadsheetId); // Ambil status Encrypted
        const cookies = req.cookies || {};
        const storedHash = cookies.passwordHash;

        if (encryptedStatus) {
            if (storedHash) {
                const currentHash = hashPassword(passwordData.password);
                if (storedHash === currentHash) {
                    res.redirect('/main'); // Jika sudah login, redirect ke /main
                } else {
                    res.clearCookie('passwordHash'); // Hapus cookie jika hash tidak cocok
                    next();
                }
            } else {
                next(); // Jika belum login, lanjutkan ke /security
            }
        } else {
            if (storedHash) {
                res.clearCookie('passwordHash'); // Hapus cookie jika sudah login
                res.redirect('/main'); // Jika sudah login, redirect ke /main
            } else {
                res.redirect('/main');
            }
        }
    }


    // Route untuk halaman utama (main.html)
    app.get('/main', checkLogin, async (req, res) => {
        res.sendFile(path.join(__dirname, 'src', 'main', 'main.html'));
    });

    // Route untuk halaman security (security.html)
    app.get('/security', checkNotLoggedIn, async (req, res) => {
        res.sendFile(path.join(__dirname, 'src', 'security', 'security.html'));
    });

    // Route untuk root (/)
    app.get('/', async (req, res) => {
        const encryptedStatus = await db.encryptedStatus(sheets, spreadsheetId);
        const cookies = req.cookies || {};
        const storedHash = cookies.passwordHash;

        if (encryptedStatus) {
            if (storedHash) {
                const currentHash = hashPassword(passwordData.password);
                if (storedHash === currentHash) {
                    return res.redirect('/main'); // Jika sudah login, redirect ke /main
                } else {
                    res.clearCookie('passwordHash');
                    return res.redirect('/security'); // Jika hash tidak cocok, redirect ke /security
                }
            } else {
                return res.redirect('/security'); // Jika belum login, redirect ke /security
            }
        } else {
            // Logika ketika Encrypted False
            if (storedHash) {
                res.clearCookie('passwordHash'); // Hapus cookie passwordHash jika sudah login
                return res.redirect('/main'); // Arahkan ke halaman utama
            } else {
                return res.redirect('/main'); // Pengguna belum login, tetap bisa mengakses /main
            }
        }
    });

    // Endpoint untuk memeriksa password dan set cookie
    app.post('/check-password', async (req, res) => {
        const encryptedStatus = await db.encryptedStatus(sheets, spreadsheetId);
        const { password } = req.body;
        const cleanInput = password.replace(/\s+/g, ' ').trim(); // Bersihkan input
        const hashedInput = hashPassword(cleanInput); // Hash input pengguna
        const currentHash = hashPassword(passwordData.password); // Hash password saat ini dari password.json

        if (encryptedStatus) {
            if (hashedInput === currentHash) {
                res.cookie('passwordHash', currentHash, { maxAge: 24 * 60 * 60 * 1000 }); // 24 jam
                res.json({ success: true, redirect: '/main' });
            } else {
                res.json({ success: false, message: 'Frasa rahasia salah! Silakan coba lagi.' });
            }
        } else {
            // Ketika Encrypted False, tidak perlu password lagi
            res.cookie('passwordHash', '', { maxAge: 0 }); // Hapus cookie
            res.json({ success: true, redirect: '/main' });
        }
    });

    // Endpoint untuk mengambil data.json
    app.post('/api/data', async (req, res) => {
        try {
            // Ambil status Encrypted
            const encryptedStatus = await db.encryptedStatus(sheets, spreadsheetId); // Ambil status Encrypted

            const referer = req.get('Referer');
            const bodyPassword = req.body.password;

            // Sesuaikan dengan URL halaman main
            const expectedRefererRegex = new RegExp(`^https?://${escapeRegex(req.hostname)}(:${PORT})?/main/?$`);

            // Fungsi untuk menghindari karakter spesial regex
            function escapeRegex(str) {
                return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

            // Periksa apakah referer dan password valid
            if (!referer || !bodyPassword) {
                return res.status(400).json({ error: 'Referer atau password tidak ditemukan' });
            }

            if (!expectedRefererRegex.test(referer)) {
                return res.status(403).json({ error: 'Referer tidak valid' });
            }

            if (encryptedStatus && bodyPassword !== hashPassword(passwordData.password)) {
                return res.status(403).json({ error: 'Password tidak valid' });
            }

            if (!encryptedStatus && bodyPassword !== "Hello, World!") {
                return res.status(403).json({ error: 'Password tidak valid' });
            }

            // Ambil data dari Google Sheets
            const mainData = await db.mainData.get(sheets, spreadsheetId);
            return res.json(mainData);
        } catch (error) {
            console.error('💥 Error reading sheets:', error.message);
            return res.status(500).json({ error: 'Gagal mengambil data' });
        }
    });

    // Cek expiry setiap menit
    setInterval(async () => {
        passwordData = await checkExpiry(sheets, spreadsheetId, passwordData); // Perbarui passwordData setelah pengecekan
    }, 60000); // Cek setiap 1 menit (untuk pengujian, ubah ke 3600000 untuk 1 jam)

    // Jalankan server
    app.listen(PORT, () => {
        console.log('%c🚀 Server berjalan di http://localhost:%d', 'color: #1abc9c; font-weight: bold;', PORT);
    });
})();