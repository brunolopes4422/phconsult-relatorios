const supabase = require('../lib/supabase')

async function list(req, res) {
  const { data, error } = await supabase
    .from('job_queue')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

module.exports = { list }