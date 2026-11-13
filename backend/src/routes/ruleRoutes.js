const express = require('express');
const RuleController = require('../controllers/ruleController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createRuleSchema } = require('../validators/ruleValidators');

const router = express.Router();

router.get('/', authenticate, RuleController.getRules);
router.post('/', authenticate, authorize(['admin']), validate(createRuleSchema), RuleController.createRule);
router.get('/:id', authenticate, RuleController.getRuleById);
router.put('/:id', authenticate, authorize(['admin']), RuleController.updateRule);
router.post('/:id/activate', authenticate, authorize(['admin']), RuleController.activateRule);
router.get('/:id/versions', authenticate, RuleController.getVersions);

module.exports = router;
