const { z } = require('zod');

const criterionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'not_in', 'exists', 'contains']),
  value: z.any()
});

const createRuleSchema = z.object({
  body: z.object({
    ruleCode: z.string().min(2).max(50).toUpperCase(),
    workflowCode: z.string().min(2).toUpperCase(),
    name: z.string().min(2),
    description: z.string().optional(),
    priority: z.number().int().min(1).max(1000),
    conditions: z.object({
      operator: z.enum(['AND', 'OR']).default('AND'),
      rules: z.array(criterionSchema).min(1)
    }),
    action: z.object({
      outcome: z.enum(['AUTO_APPROVE', 'MANUAL_REVIEW', 'REJECT', 'NEXT_STAGE']),
      reason: z.string().min(3)
    })
  })
});

module.exports = {
  createRuleSchema
};
