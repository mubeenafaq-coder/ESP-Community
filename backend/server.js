require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- FILE UPLOAD SETUP ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'backend/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- DATABASE CONNECTION ---
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
db.connect((err) => {
    if (err) console.error('❌ DB Error:', err.message);
    else console.log('✅ Connected to MySQL Database');
});

// =========================
//        EXISTING ROUTES
// =========================
app.post('/api/upload-file', upload.single('file'), (req, res) => {
    const { assignment_id, sender_id, message } = req.body;
    const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    const sql = "INSERT INTO chat_messages (assignment_id, sender_id, message, file_url) VALUES (?, ?, ?, ?)";
    db.query(sql, [assignment_id, sender_id, message || 'Uploaded a file', fileUrl], (err, result) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true, fileUrl });
    });
});

app.get('/api/get-messages/:assignment_id', (req, res) => {
    const sql = "SELECT * FROM chat_messages WHERE assignment_id = ? ORDER BY created_at ASC";
    db.query(sql, [req.params.assignment_id], (err, results) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/submit-payment', (req, res) => {
    const { assignment_id, student_id, transaction_id, amount, method } = req.body;
    const sql = "INSERT INTO payments (assignment_id, student_id, transaction_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?, 'pending_verification')";
    db.query(sql, [assignment_id, student_id, transaction_id, amount, method], (err, result) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ message: "Payment submitted" });
    });
});

app.get('/api/admin/payments', (req, res) => {
    const sql = "SELECT p.*, u.username FROM payments p JOIN users u ON p.student_id = u.id WHERE p.status = 'pending_verification'";
    db.query(sql, (err, results) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/verify-payment', (req, res) => {
    const { payment_id } = req.body;
    const sql = "UPDATE payments SET status = 'verified' WHERE id = ?";
    db.query(sql, [payment_id], (err, result) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/admin/send-message', (req, res) => {
    const { assignment_id, message } = req.body;
    const sql = "INSERT INTO chat_messages (assignment_id, sender_id, message, is_admin) VALUES (?, 999, ?, 1)";
    db.query(sql, [assignment_id, message], (err, result) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/submit-order', (req, res) => {
    const { name, phone, service, details } = req.body;
    const tempEmail = phone.replace(/[^0-9]/g, '') + '@client.esp.com';
    const userSql = "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'student')";
    
    db.query(userSql, [name, tempEmail, 'client_password_123'], (err, userResult) => {
        if (err && err.errno === 1062) { 
            const findUser = "SELECT id FROM users WHERE email = ?";
            db.query(findUser, [tempEmail], (err2, userRows) => {
                if(err2) return res.status(500).json({ error: err2.message });
                createOrderForUser(userRows[0].id, name, service, details, res);
            });
        } else if (err) {
            return res.status(500).json({ error: err.message });
        } else {
            createOrderForUser(userResult.insertId, name, service, details, res);
        }
    });
});

function createOrderForUser(studentId, name, service, details, res) {
    const orderSql = "INSERT INTO assignments (title, description, price, student_id, status) VALUES (?, ?, 0, ?, 'pending')";
    db.query(orderSql, [service, details, studentId], (err, orderResult) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true, orderName: name, orderId: orderResult.insertId });
    });
}

// =========================
//        NEW ROUTES
// =========================

// 9. Get all Services (The 5 pricing tiers)
app.get('/api/services', (req, res) => {
    // Hardcoded beautifully to match your table
    const services = [
        { id: 1, name: 'Basic', scope: 'Small assignments, short reports, simple tasks', price: '300 - 500', delivery: '1 Week', urgent: '+150/day', best_for: 'Quick homework help' },
        { id: 2, name: 'Standard', scope: 'Medium assignments, essays, structured projects', price: '600 - 900', delivery: '1 Week', urgent: '+150/day', best_for: 'Reliable mid-level work' },
        { id: 3, name: 'Advanced', scope: 'Larger assignments, detailed reports, multi-section projects', price: '1,000 - 1,500', delivery: '1 Week', urgent: '+150/day', best_for: 'Complex coursework' },
        { id: 4, name: 'Premium', scope: 'End-term projects, research papers, comprehensive work', price: '1,600 - 2,200', delivery: '1 Week', urgent: '+150/day', best_for: 'High-quality, detailed work' },
        { id: 5, name: 'Group Project', scope: 'Collaborative assignments for 2–4 students, combined docs', price: '2,500 - 3,500', delivery: '1 Week', urgent: '+150/day', best_for: 'Team submissions' }
    ];
    res.json(services);
});

// 10. Submit a Review
app.post('/api/submit-review', (req, res) => {
    const { student_name, rating, comment } = req.body;
    const sql = "INSERT INTO reviews (student_name, rating, comment) VALUES (?, ?, ?)";
    db.query(sql, [student_name, rating, comment], (err, result) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Review submitted!" });
    });
});

// 11. Get all Reviews
app.get('/api/reviews', (req, res) => {
    const sql = "SELECT * FROM reviews ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if(err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));