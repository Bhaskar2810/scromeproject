const { z } = require('zod');

const createRequestSchema = z.object({
  body: z.object({
    workflowCode: z.string().min(1).toUpperCase(),
    idempotencyKey: z.string().optional(),
    payload: z.record(z.any()),
    metadata: z.object({
      clientIp: z.string().optional(),
      userAgent: z.string().optional(),
      source: z.string().optional(),
      tags: z.array(z.string()).optional()
    }).optional()
  })
});

const manualReviewSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    notes: z.string().min(3, 'Reviewer notes must be at least 3 characters')
  })
});

module.exports = {
  createRequestSchema,
  manualReviewSchema
};
