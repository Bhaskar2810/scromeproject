class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
    const payload = {
      success: true,
      message,
      data
    };
    if (meta) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null, errorCode = null) {
    const payload = {
      success: false,
      message,
      errors: errors || undefined,
      errorCode: errorCode || undefined
    };
    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
