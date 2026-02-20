const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./database');

const {
    buildCorsOptions,
    securityHeaders,
    createRateLimiter,
} = require('./middleware/securityMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

if (
    process.env.NODE_ENV === 'production'
    && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'Alexsousarodrigues2026@gmail.com')
) {
    throw new Error('JWT_SECRET inseguro em producao. Configure uma chave forte.');
}

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(securityHeaders);
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../client')));

const apiLimiter = createRateLimiter({
    windowMs: Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.API_RATE_LIMIT_MAX || 300),
    keyPrefix: 'api',
});

const authLimiter = createRateLimiter({
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 15),
    keyPrefix: 'auth-login',
});

app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);

const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const financialRoutes = require('./routes/financialRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const professionalRoutes = require('./routes/professionalRoutes');
const configRoutes = require('./routes/configRoutes');
const projectRoutes = require('./routes/projectRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const productRoutes = require('./routes/productRoutes');
const clientAccountRoutes = require('./routes/clientAccountRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/config', configRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/client-accounts', clientAccountRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
