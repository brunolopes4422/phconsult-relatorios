const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const supabase = require('../lib/supabase')

async function setup(req, res) {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios' })

  // Verifica se já existe algum usuário
  const { data: existing } = await supabase.from('users').select('id').limit(1)
  if (existing && existing.length > 0) {
    return res.status(400).json({ error: 'Setup já realizado' })
  }

  const hash = await bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, password: hash, is_admin: true })
    .select('id, name, email, is_admin')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Admin criado com sucesso', user: data })
}

async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Campos obrigatórios' })

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single()

  if (error || !user) return res.status(401).json({ error: 'Credenciais inválidas' })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' })

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({ token, user: { id: user.id, name: user.name, email: user.email, is_admin: user.is_admin } })
}

async function setupStatus(req, res) {
  const { data } = await supabase.from('users').select('id').limit(1)
  res.json({ configured: data && data.length > 0 })
}

module.exports = { setup, login, setupStatus }
