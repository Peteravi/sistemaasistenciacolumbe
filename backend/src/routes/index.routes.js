const router = require('express').Router();

const systemRoutes = require('./system.routes');
const authRoutes = require('./auth.routes');
const marcacionesRoutes = require('./marcaciones.routes');
const adminRoutes = require('./admin.routes');
const reportesRoutes = require('./reportes.routes');

router.use('/', systemRoutes);
router.use('/auth', authRoutes);
router.use('/marcaciones', marcacionesRoutes);
router.use('/admin', adminRoutes);
router.use('/reportes', reportesRoutes);

module.exports = router;