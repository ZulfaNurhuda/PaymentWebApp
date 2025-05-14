const crypto = require('crypto');
const moment = require('moment-timezone'); // Menggunakan moment-timezone untuk zona waktu
const db = require('./database_managers'); // Impor dari database_managers.js

// Fungsi untuk hash password menggunakan SHA-256
function hashPassword(password, from) {
    const cleanPassword = password.replace(/\s+/g, ' ').trim();
    return crypto.createHash('sha256').update(cleanPassword).digest('hex');
}

// Generate password acak dengan 10 kata (dipisahkan oleh spasi)
function generateRandomPassword(wordCount) {
    const words = require('./word_data_managers')(wordCount); // Mengimpor dari get_data.js
    return words.trim();
}

// Fungsi untuk mendapatkan waktu tengah malam berikutnya di WIB (GMT+7)
function getNextMidnight() {
    const now = moment.tz('Asia/Jakarta'); // Gunakan zona waktu Asia/Jakarta (WIB, GMT+7)
    const midnight = now.clone().set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).add(1, 'day'); // Tengah malam besok
    return midnight;
}

// Baca atau buat password.json dengan 10 kata acak (plain text) dan expiry_date
async function loadPassword(sheets, spreadsheetId) {
    try {
        let passwordData;
        passwordData = await db.passwordData.get(sheets, spreadsheetId);
        passwordData = checkExpiry(sheets, spreadsheetId, passwordData);
        return passwordData;
    } catch (error) {
        console.error('💥 Error loading password:', error.message);
        const plainPassword = generateRandomPassword(10).trim();
        const passwordData = {
            password: plainPassword,
            expiry_date: getNextMidnight().toISOString()
        };
        await db.passwordData.change(sheets, spreadsheetId, passwordData);
        return passwordData;
    }
}

// Fungsi untuk memeriksa dan memperbarui password jika expiry_date sudah lewat
async function checkExpiry(sheets, spreadsheetId, passwordData) {
    const now = moment.tz('Asia/Jakarta'); // Gunakan zona waktu WIB (GMT+7)
    if (now.isAfter(moment.tz(passwordData.expiry_date, 'Asia/Jakarta'))) {
        const newPassword = generateRandomPassword(10).trim();
        passwordData.password = newPassword;
        passwordData.expiry_date = getNextMidnight().toISOString();
        await db.passwordData.change(sheets, spreadsheetId, passwordData);
        console.log('%c🕛 Password direset ke default (10 kata acak baru) karena expiry_date tercapai.', 'color: #f1c40f; font-weight: bold;');
        console.log(`%c📋 New Password (Plain): %c${passwordData.password}`, 'color: #3498db;', 'color: #ffffff; background-color: #34495e; padding: 2px 5px; border-radius: 3px');
        console.log(`%c🔒 New Hashed Password: %c${hashPassword(passwordData.password)}`, 'color: #e74c3c;', 'color: #ffffff; background-color: #2c3e50; padding: 2px 5px; border-radius: 3px');
        console.log(`%c⏰ New Expiry Date: %c${moment.tz(passwordData.expiry_date, 'Asia/Jakarta').format('dddd, D MMMM YYYY HH:mm:ss z')}`, 'color: #f1c40f;', 'color: #ffffff; background-color: #34495e; padding: 2px 5px; border-radius: 3px');
    }
    return passwordData;
}

// Fungsi untuk log informasi password
function logPasswordInfo(passwordData) {
    console.log('%c✅ Password System Initialized', 'color: #2ecc71; font-weight: bold;');
    console.log(`%c📋 Current Password (Plain): %c${passwordData.password}`, 'color: #3498db;', 'color: #ffffff; background-color: #34495e; padding: 2px 5px; border-radius: 3px');
    console.log(`%c🔒 Hashed Password: %c${hashPassword(passwordData.password)}`, 'color: #e74c3c;', 'color: #ffffff; background-color: #2c3e50; padding: 2px 5px; border-radius: 3px');
    console.log(`%c⏰ Expiry Date: %c${moment.tz(passwordData.expiry_date, 'Asia/Jakarta').format('dddd, D MMMM YYYY HH:mm:ss z')}`, 'color: #f1c40f;', 'color: #ffffff; background-color: #34495e; padding: 2px 5px; border-radius: 3px');
}

module.exports = {
    hashPassword,
    loadPassword,
    checkExpiry,
    logPasswordInfo
};