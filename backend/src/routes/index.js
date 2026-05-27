const router = require('express').Router()
const { auth, adminOnly } = require('../middleware/auth')
const authCtrl = require('../controllers/authController')
const clientsCtrl = require('../controllers/clientsController')
const recipientsCtrl = require('../controllers/recipientsController')
const reportsCtrl = require('../controllers/reportsController')
const usersCtrl = require('../controllers/usersController')
const configCtrl = require('../controllers/configController')
const schedulesCtrl = require('../controllers/schedulesController')
const accountsCtrl = require('../controllers/accountsController')
const jobsCtrl = require('../controllers/jobsController')


// routerjobs
router.get('/jobs', jobsCtrl.list)
router.get('/health', (req, res) => res.json({ ok: true }))

// Auth (public)
router.get('/setup/status', authCtrl.setupStatus)
router.post('/setup', authCtrl.setup)
router.post('/auth/login', authCtrl.login)

// OAuth callback
router.get('/auth/callback', clientsCtrl.caCallback)

// Rota pública para página de conexão do cliente
router.get('/public/clients/:id', clientsCtrl.getPublicClient)

// Cron (protegido por secret)
router.post('/cron/run', schedulesCtrl.runCron)

// Protected routes
router.use(auth)

// Cron por cliente (autenticado)
router.post('/cron/run-client', schedulesCtrl.runClient)

// Clients
router.get('/clients', clientsCtrl.list)
router.get('/clients/:id', clientsCtrl.get)
router.post('/clients', clientsCtrl.create)
router.put('/clients/:id', clientsCtrl.update)
router.delete('/clients/:id', clientsCtrl.remove)
router.get('/clients/:id/ca-auth-url', clientsCtrl.caAuthUrl)
router.get('/clients/:id/credentials', clientsCtrl.getCredentials)

// Accounts
router.get('/clients/:id/accounts', accountsCtrl.listAccounts)
router.post('/clients/:id/accounts', accountsCtrl.saveAccounts)

// Recipients
router.get('/clients/:clientId/recipients', recipientsCtrl.listByClient)
router.post('/clients/:clientId/recipients', recipientsCtrl.create)
router.put('/recipients/:id', recipientsCtrl.update)
router.delete('/recipients/:id', recipientsCtrl.remove)

// Schedules
router.get('/clients/:clientId/schedules', schedulesCtrl.list)
router.post('/clients/:clientId/schedules', schedulesCtrl.create)
router.put('/schedules/:id', schedulesCtrl.update)
router.delete('/schedules/:id', schedulesCtrl.remove)

// Reports
router.post('/reports/generate', reportsCtrl.generate)
router.post('/reports/send', reportsCtrl.send)
router.get('/reports/history', reportsCtrl.history)

// Config
router.get('/config', configCtrl.getConfig)
router.post('/config', configCtrl.setConfig)
router.get('/config/zap-connections', configCtrl.getConnections)

// Users (admin only)
router.get('/users', adminOnly, usersCtrl.list)
router.post('/users', adminOnly, usersCtrl.create)
router.put('/users/:id', adminOnly, usersCtrl.update)
router.delete('/users/:id', adminOnly, usersCtrl.remove)

router.get('/clients/:id/accounts/refresh', accountsCtrl.refreshAccounts)

module.exports = router