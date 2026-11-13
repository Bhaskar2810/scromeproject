const express = require('express');
const WorkflowController = require('../controllers/workflowController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createWorkflowSchema } = require('../validators/workflowValidators');

const router = express.Router();

router.get('/', authenticate, WorkflowController.getWorkflows);
router.post('/', authenticate, authorize(['admin']), validate(createWorkflowSchema), WorkflowController.createWorkflow);
router.get('/:id', authenticate, WorkflowController.getWorkflowById);
router.put('/:id', authenticate, authorize(['admin']), WorkflowController.updateWorkflow);
router.post('/:id/activate', authenticate, authorize(['admin']), WorkflowController.activateWorkflow);
router.get('/:id/versions', authenticate, WorkflowController.getVersions);

module.exports = router;
