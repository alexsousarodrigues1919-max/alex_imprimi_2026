const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_123';

function verifyToken(req, res, next) {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
        return res.status(403).json({ message: 'Token nao fornecido.' });
    }

    const token = header.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Token invalido ou expirado.' });
        }

        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
}

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.userRole)) {
            return res.status(403).json({ message: 'Sem permissao para esta acao.' });
        }

        next();
    };
}

module.exports = verifyToken;
module.exports.allowRoles = allowRoles;
module.exports.isAdmin = allowRoles('administrador', 'admin');
