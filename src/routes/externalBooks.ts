import { Router } from 'express';
import ExternalBooksController from '../controllers/ExternalBooksController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/external-books/search:
 *   get:
 *     summary: Search books across all external sources
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for books
 *       - in: query
 *         name: maxPerSource
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum results per external source
 *     responses:
 *       200:
 *         description: Search results from all sources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 totalResults:
 *                   type: integer
 *                 books:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExternalBook'
 *       400:
 *         description: Missing or invalid query parameter
 *       401:
 *         description: Unauthorized
 */
router.get('/search', ExternalBooksController.searchExternalBooks);

/**
 * @swagger
 * /api/external-books/search/{source}:
 *   get:
 *     summary: Search books from specific external source
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google_books, open_library, project_gutenberg, internet_archive]
 *         description: External book source
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for books
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results from specific source
 *       400:
 *         description: Invalid source or missing query
 *       401:
 *         description: Unauthorized
 */
router.get('/search/:source', ExternalBooksController.searchSpecificSource);

/**
 * @swagger
 * /api/external-books/import:
 *   post:
 *     summary: Import external book to user's library
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - externalBook
 *             properties:
 *               externalBook:
 *                 $ref: '#/components/schemas/ExternalBook'
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *                 description: Make the imported book public
 *     responses:
 *       201:
 *         description: Book successfully imported
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 book:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid request data or missing download URL
 *       409:
 *         description: Book already exists in library
 *       401:
 *         description: Unauthorized
 */
router.post('/import', ExternalBooksController.importExternalBook);

/**
 * @swagger
 * /api/external-books/enhance/{id}:
 *   post:
 *     summary: Enhance existing book metadata using external APIs
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Book ID to enhance
 *     responses:
 *       200:
 *         description: Book metadata enhanced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 book:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: Invalid book ID
 *       404:
 *         description: Book not found or no access
 *       401:
 *         description: Unauthorized
 */
router.post('/enhance/:id', ExternalBooksController.enhanceBookMetadata);

/**
 * @swagger
 * /api/external-books/trending:
 *   get:
 *     summary: Get trending/popular books from all sources
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of trending books to return
 *     responses:
 *       200:
 *         description: List of trending books
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalResults:
 *                   type: integer
 *                 books:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ExternalBook'
 *       401:
 *         description: Unauthorized
 */
router.get('/trending', ExternalBooksController.getTrendingBooks);

/**
 * @swagger
 * /api/external-books/bulk-enhance:
 *   post:
 *     summary: Bulk enhance metadata for multiple books
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of book IDs to enhance
 *               enhanceAll:
 *                 type: boolean
 *                 default: false
 *                 description: Enhance all user's books if true
 *     responses:
 *       200:
 *         description: Bulk enhancement completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     enhanced:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk-enhance', ExternalBooksController.bulkEnhanceMetadata);

/**
 * @swagger
 * /api/external-books/sync-logs:
 *   get:
 *     summary: Get synchronization logs and statistics (Admin only)
 *     tags: [External Books]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs per page
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source
 *       - in: query
 *         name: operation
 *         schema:
 *           type: string
 *         description: Filter by operation
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Sync logs and statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SyncLog'
 *                 pagination:
 *                   type: object
 *                 statistics:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/sync-logs', ExternalBooksController.getSyncLogs);

export default router;