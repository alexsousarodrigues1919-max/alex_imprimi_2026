function parseAllowedOrigins() {
    return String(process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function isDev() {
    return (process.env.NODE_ENV || 'development') !== 'production';
}

function isOriginAllowed(origin) {
    const allowedOrigins = parseAllowedOrigins();

    // Requests sem Origin (curl/mobile app) podem passar.
    if (!origin) return true;

    if (allowedOrigins.length > 0) {
        return allowedOrigins.includes(origin);
    }

    if (isDev()) {
        return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    }

    // Fallback seguro para ambientes comuns de deploy quando ALLOWED_ORIGINS
    // ainda nao foi configurado.
    return /^https:\/\/([a-z0-9-]+\.)?(onrender\.com|railway\.app)$/i.test(origin);
}

function buildCorsOptions() {
    return {
        origin(origin, callback) {
            if (isOriginAllowed(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    };
}

function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
}

function createRateLimiter(options = {}) {
    const windowMs = Number(options.windowMs || 60000);
    const max = Number(options.max || 300);
    const keyPrefix = String(options.keyPrefix || 'global');
    const hits = new Map();

    return (req, res, next) => {
        const now = Date.now();
        const forwarded = req.headers['x-forwarded-for'];
        const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '')
            || req.ip
            || req.connection?.remoteAddress
            || 'unknown';

        const key = `${keyPrefix}:${ip}`;
        const current = hits.get(key);

        if (!current || now - current.start >= windowMs) {
            hits.set(key, { start: now, count: 1 });
            return next();
        }

        current.count += 1;

        if (current.count > max) {
            const retryAfterSec = Math.ceil((windowMs - (now - current.start)) / 1000);
            res.setHeader('Retry-After', String(Math.max(retryAfterSec, 1)));
            return res.status(429).json({ message: 'Muitas requisicoes. Tente novamente em instantes.' });
        }

        if (hits.size > 5000) {
            for (const [mapKey, value] of hits.entries()) {
                if (now - value.start >= windowMs) hits.delete(mapKey);
            }
        }

        return next();
    };
}

module.exports = {
    buildCorsOptions,
    securityHeaders,
    createRateLimiter,
};
