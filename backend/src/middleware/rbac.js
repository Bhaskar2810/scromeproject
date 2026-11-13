const ApiResponse = require('../utils/apiResponse');

const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required before authorization.', 401, null, 'UNAUTHENTICATED');
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return ApiResponse.error(
        res,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`,
        403,
        null,
        'FORBIDDEN'
      );
    }

    next();
  };
};

module.exports = authorize;
