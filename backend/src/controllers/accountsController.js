const supabase = require('../lib/supabase')
const axios = require('axios')
const { getValidToken } = require('./clientsController')

const CA_BASE = 'https://api-v2.contaazul.com'
const OMIE_BASE = 'https://app.omie.com.br/api/v1'

async function fetchFromCA(clientId) {
    const token = await getValidToken(clientId)
    const { data: response } = await axios.get(`${CA_BASE}/v1/conta-financeira`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { pagina: 1, tamanho_pagina: 100, apenas_ativo: true }
    })
    console.log('CA ACCOUNTS COUNT:', response?.itens_totais, 'itens:', response?.itens?.length)
    console.log('CA ACCOUNTS NOMES:', response?.itens?.map(a => a.nome))
    const items = response?.itens || response?.content || response || []
    return items.map(a => ({
        account_id: String(a.id || a.codigo),
        account_name: a.nome || a.descricao || a.name,
        account_type: a.tipo || 'bank',
    }))
}

async function fetchFromOmie(appKey, appSecret) {
    try {
        const { data } = await axios.post(`${OMIE_BASE}/geral/contacorrente/`, {
            call: 'ListarContasCorrentes',
            app_key: appKey,
            app_secret: appSecret,
            param: [{ pagina: 1, registros_por_pagina: 100, apenas_importado_api: 'N' }]
        })
        const items = data?.ListarContasCorrentes || []
        return items
            .filter(a => a.nao_resumo !== 'S' && a.inativo !== 'S')
            .map(a => ({
                account_id: String(a.nCodCC),
                account_name: a.descricao,
                account_type: a.tipo_conta_corrente || 'bank',
            }))
    } catch (err) {
        // Retry após 3s em caso de ECONNRESET
        if (err.code === 'ECONNRESET') {
            await new Promise(resolve => setTimeout(resolve, 3000))
            return fetchFromOmie(appKey, appSecret)
        }
        throw err
    }
}

async function listAccounts(req, res) {
    const { id } = req.params

    const { data: client } = await supabase
        .from('clients')
        .select('id, integration_type, ca_connected, omie_app_key, omie_app_secret')
        .eq('id', id)
        .single()

    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

    // Se já tem contas salvas, retorna do banco
    const { data: saved } = await supabase
        .from('client_accounts')
        .select('*')
        .eq('client_id', id)

    if (saved && saved.length > 0) {
        return res.json(saved.map(a => ({
            account_id: a.account_id,
            account_name: a.account_name,
            account_type: a.account_type,
            saved_id: a.id,
            include_in_report: a.include_in_report,
        })))
    }

    // Se não tem nada salvo, busca da API
    try {
        let externalAccounts = []

        if (client.integration_type === 'omie') {
            if (!client.omie_app_key) return res.status(400).json({ error: 'Chaves Omie não configuradas' })
            externalAccounts = await fetchFromOmie(client.omie_app_key, client.omie_app_secret)
        } else {
            if (!client.ca_connected) return res.status(400).json({ error: 'Cliente não conectado ao Conta Azul' })
            externalAccounts = await fetchFromCA(id)
        }

        res.json(externalAccounts.map(a => ({
            ...a,
            saved_id: null,
            include_in_report: false,
        })))
    } catch (err) {
        console.error('listAccounts error:', err.response?.data || err.message)
        res.status(500).json({ error: err.message })
    }
}

async function refreshAccounts(req, res) {
    const { id } = req.params

    const { data: client } = await supabase
        .from('clients')
        .select('id, integration_type, ca_connected, omie_app_key, omie_app_secret')
        .eq('id', id)
        .single()

    if (!client) return res.status(404).json({ error: 'Cliente não encontrado' })

    try {
        let externalAccounts = []

        if (client.integration_type === 'omie') {
            if (!client.omie_app_key) return res.status(400).json({ error: 'Chaves Omie não configuradas' })
            externalAccounts = await fetchFromOmie(client.omie_app_key, client.omie_app_secret)
        } else {
            if (!client.ca_connected) return res.status(400).json({ error: 'Cliente não conectado ao Conta Azul' })
            externalAccounts = await fetchFromCA(id)
        }

        // Preserva seleção atual
        const { data: saved } = await supabase
            .from('client_accounts')
            .select('*')
            .eq('client_id', id)

        res.json(externalAccounts.map(a => {
            const found = saved?.find(s => s.account_id === a.account_id)
            return {
                ...a,
                saved_id: found?.id || null,
                include_in_report: found ? found.include_in_report : false,
            }
        }))
    } catch (err) {
        console.error('refreshAccounts error:', err.response?.data || err.message)
        res.status(500).json({ error: err.message })
    }
}

async function saveAccounts(req, res) {
    const { id: client_id } = req.params
    const { accounts } = req.body

    if (!accounts || !Array.isArray(accounts)) {
        return res.status(400).json({ error: 'Accounts obrigatório' })
    }

    await supabase.from('client_accounts').delete().eq('client_id', client_id)

    const toInsert = accounts.map(a => ({
        client_id,
        account_id: a.account_id,
        account_name: a.account_name,
        account_type: a.account_type,
        include_in_report: a.include_in_report,
    }))

    const { error } = await supabase.from('client_accounts').insert(toInsert)
    if (error) return res.status(500).json({ error: error.message })

    res.json({ message: 'Contas salvas com sucesso' })
}

async function getSelectedAccountIds(clientId) {
    const { data } = await supabase
        .from('client_accounts')
        .select('account_id')
        .eq('client_id', clientId)
        .eq('include_in_report', true)
    return (data || []).map(a => a.account_id)
}

module.exports = { listAccounts, saveAccounts, getSelectedAccountIds, refreshAccounts }