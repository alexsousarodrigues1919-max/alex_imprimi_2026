const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
require('./database');


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../client')));

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
const documentRoutes = require('./routes/documentRoutes');

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
app.use('/api/documents', documentRoutes);

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
