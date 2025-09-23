import { Router } from 'express';
import AdminController from '../controllers/AdminController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(AdminController.checkAdminRole);

/**
 * @swagger
 * /api/admin/sync-service/status:
 *   get:
 *     summary: Get sync service status and statistics
 *     tags: [Admin - Sync Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync service status and statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 syncService:
 *                   type: object
 *                   properties:
 *                     isRunning:
 *                       type: boolean
 *                     jobCount:
 *                       type: integer
 *                     nextRuns:
 *                       type: array
 *                 recentLogs:
 *                   type: array
 *                 sourceStatistics:
 *                   type: array
 *                 summary:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/sync-service/status', AdminController.getSyncServiceStatus);

/**
 * @swagger
 * /api/admin/sync-service/start:
 *   post:
 *     summary: Start the scheduled sync service
 *     tags: [Admin - Sync Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync service started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/sync-service/start', AdminController.startSyncService);

/**
 * @swagger
 * /api/admin/sync-service/stop:
 *   post:
 *     summary: Stop the scheduled sync service
 *     tags: [Admin - Sync Service]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync service stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/sync-service/stop', AdminController.stopSyncService);

/**
 * @swagger
 * /api/admin/sync-service/trigger/{operation}:
 *   post:
 *     summary: Manually trigger a sync operation
 *     tags: [Admin - Sync Service]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operation
 *         required: true
 *         schema:
 *           type: string
 *           enum: [trending, metadata, popular, cleanup]
 *         description: Sync operation to trigger
 *     responses:
 *       200:
 *         description: Manual sync operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 duration:
 *                   type: string
 *       400:
 *         description: Invalid operation
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/sync-service/trigger/:operation', AdminController.triggerManualSync);

/**
 * @swagger
 * /api/admin/external-sources:
 *   get:
 *     summary: Get all external book sources
 *     tags: [Admin - External Sources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of external sources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ExternalSource'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/external-sources', AdminController.getExternalSources);

/**
 * @swagger
 * /api/admin/external-sources/initialize:
 *   post:
 *     summary: Initialize default external sources
 *     tags: [Admin - External Sources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: External sources initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 createdSources:
 *                   type: array
 *                 allSources:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/external-sources/initialize', AdminController.initializeExternalSources);

/**
 * @swagger
 * /api/admin/external-sources/{id}:
 *   put:
 *     summary: Update external source configuration
 *     tags: [Admin - External Sources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: External source ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               apiKey:
 *                 type: string
 *               isEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: External source updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 source:
 *                   $ref: '#/components/schemas/ExternalSource'
 *       400:
 *         description: Invalid source ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.put('/external-sources/:id', AdminController.updateExternalSource);

/**
 * @swagger
 * /api/admin/statistics:
 *   get:
 *     summary: Get comprehensive system statistics
 *     tags: [Admin - Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalBooks:
 *                       type: integer
 *                     publicBooks:
 *                       type: integer
 *                     externalBooks:
 *                       type: integer
 *                     totalUsers:
 *                       type: integer
 *                 growth:
 *                   type: object
 *                 syncActivity:
 *                   type: object
 *                 topStatistics:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/statistics', AdminController.getSystemStatistics);

/**
 * @swagger
 * /api/admin/cleanup:
 *   post:
 *     summary: Clean up system data
 *     tags: [Admin - Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operation
 *             properties:
 *               operation:
 *                 type: string
 *                 enum: [old_logs, orphaned_books, duplicate_books]
 *                 description: Cleanup operation to perform
 *     responses:
 *       200:
 *         description: Cleanup operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *       400:
 *         description: Invalid cleanup operation
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/cleanup', AdminController.cleanupSystemData);

export default router;