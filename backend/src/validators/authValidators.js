const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2),
    role: z.enum(['admin', 'reviewer', 'api_user']).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    usernameOrEmail: z.string().min(1),
    password: z.string().min(1)
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
