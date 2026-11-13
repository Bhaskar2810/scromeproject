const ApiResponse = require('../utils/apiResponse');

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!parsed.success) {
      const formattedErrors = parsed.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      return ApiResponse.error(
        res,
        'Input validation failed.',
        400,
        formattedErrors,
        'VALIDATION_FAILED'
      );
    }

    // Reassign validated data
    req.validated = parsed.data;
    next();
  } catch (err) {
    return ApiResponse.error(res, 'Internal validation error.', 500, err.message);
  }
};

module.exports = validate;
