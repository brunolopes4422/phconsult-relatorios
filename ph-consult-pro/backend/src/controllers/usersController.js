const bcrypt = require('bcryptjs')
const supabase = require('../lib/supabase')

async function list(req, res) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, is_admin, is_active, created_at')
    .order('name')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function create(req, res) {
  const { name, email, password, is_admin } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios' })
  const hash = await bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, password: hash, is_admin: !!is_admin })
    .select('id, name, email, is_admin, is_active')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

async function update(req, res) {
  const { name, email, is_admin, is_active, password } = req.body
  const updates = { name, email, is_admin, is_active }
  if (password) updates.password = await bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.params.id)
    .select('id, name, email, is_admin, is_active')
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function remove(req, res) {
  if (req.user.id === req.params.id) return res.status(400).json({ error: 'Não pode remover a si mesmo' })
  const { error } = await supabase.from('users').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Usuário removido' })
}

module.exports = { list, create, update, remove }
