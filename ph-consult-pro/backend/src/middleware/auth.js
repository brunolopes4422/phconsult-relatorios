const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token ausente' })
  }
  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

function adminOnly(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }
  next()
}

module.exports = { auth, adminOnly }
