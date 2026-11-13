const express = require('express');
const ReviewController = require('../controllers/reviewController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { manualReviewSchema } = require('../validators/requestValidators');

const router = express.Router();

// Only reviewers and admins can access manual review endpoints
router.get('/', authenticate, authorize(['admin', 'reviewer']), ReviewController.getReviewQueue);
router.post('/:id/approve', authenticate, authorize(['admin', 'reviewer']), ReviewController.approve);
router.post('/:id/reject', authenticate, authorize(['admin', 'reviewer']), ReviewController.reject);

module.exports = router;
