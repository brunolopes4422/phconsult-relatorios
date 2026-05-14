const router = require('express').Router()
const { auth, adminOnly } = require('../middleware/auth')
const authCtrl = require('../controllers/authController')
const clientsCtrl = require('../controllers/clientsController')
const recipientsCtrl = require('../controllers/recipientsController')
const reportsCtrl = require('../controllers/reportsController')
const usersCtrl = require('../controllers/usersController')
const configCtrl = require('../controllers/configController')

// Auth (public)
router.get('/setup/status', authCtrl.setupStatus)
router.post('/setup', authCtrl.setup)
router.post('/auth/login', authCtrl.login)

// OAuth callback (called from browser after Conta Azul login)
router.get('/auth/callback', clientsCtrl.caCallback)

// Protected routes
router.use(auth)

// Clients
router.get('/clients', clientsCtrl.list)
router.get('/clients/:id', clientsCtrl.get)
router.post('/clients', clientsCtrl.create)
router.put('/clients/:id', clientsCtrl.update)
router.delete('/clients/:id', clientsCtrl.remove)
router.get('/clients/:id/ca-auth-url', clientsCtrl.caAuthUrl)

// Recipients
router.get('/clients/:clientId/recipients', recipientsCtrl.listByClient)
router.post('/clients/:clientId/recipients', recipientsCtrl.create)
router.put('/recipients/:id', recipientsCtrl.update)
router.delete('/recipients/:id', recipientsCtrl.remove)

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

module.exports = router
