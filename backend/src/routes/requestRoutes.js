const express = require('express');
const RequestController = require('../controllers/requestController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRequestSchema } = require('../validators/requestValidators');

const router = express.Router();

// Allow authenticated intake or public intake if client API token/key is used, here authenticate
router.post('/', authenticate, validate(createRequestSchema), RequestController.createRequest);
router.get('/', authenticate, RequestController.getRequests);
router.get('/:id', authenticate, RequestController.getRequestById);
router.post('/:id/execute', authenticate, RequestController.executeRequest);
router.get('/:id/explanation', authenticate, RequestController.getExplanation);
router.get('/:id/explain', authenticate, RequestController.getExplanation);
router.get('/:id/history', authenticate, RequestController.getHistory);

module.exports = router;
