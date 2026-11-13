const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Authentication required. Missing or malformed token.', 401, null, 'AUTH_REQUIRED');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return ApiResponse.error(res, 'Invalid or expired token.', 401, null, 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return ApiResponse.error(res, 'User not found or account is deactivated.', 401, null, 'USER_INACTIVE');
    }

    req.user = user;
    next();
  } catch (error) {
    return ApiResponse.error(res, 'Authentication error.', 500, error.message);
  }
};

module.exports = authenticate;
