const { z } = require('zod');

const createWorkflowSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(50).toUpperCase(),
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    category: z.enum(['FINANCE', 'INSURANCE', 'HR', 'PROCUREMENT', 'COMPLIANCE', 'GENERAL']).optional(),
    stages: z.array(z.object({
      name: z.string(),
      displayName: z.string(),
      description: z.string().optional(),
      order: z.number()
    })).optional(),
    transitions: z.array(z.object({
      from: z.string(),
      to: z.string(),
      condition: z.string().optional(),
      description: z.string().optional()
    })).optional()
  })
});

module.exports = {
  createWorkflowSchema
};
