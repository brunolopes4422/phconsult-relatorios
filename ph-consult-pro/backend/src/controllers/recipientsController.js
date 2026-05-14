const supabase = require('../lib/supabase')

async function listByClient(req, res) {
  const { data, error } = await supabase
    .from('recipients')
    .select('*')
    .eq('client_id', req.params.clientId)
    .order('name')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function create(req, res) {
  const { name, phone, role } = req.body
  const client_id = req.params.clientId
  if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' })

  const { data, error } = await supabase
    .from('recipients')
    .insert({ client_id, name, phone, role })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

async function update(req, res) {
  const { name, phone, role, active } = req.body
  const { data, error } = await supabase
    .from('recipients')
    .update({ name, phone, role, active })
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

async function remove(req, res) {
  const { error } = await supabase.from('recipients').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Destinatário removido' })
}

module.exports = { listByClient, create, update, remove }
