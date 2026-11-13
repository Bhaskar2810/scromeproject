const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

class AuthController {
  static async register(req, res) {
    try {
      const { username, email, password, fullName, role } = req.body;

      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }]
      });

      if (existingUser) {
        return ApiResponse.error(res, 'User with this email or username already exists.', 409, null, 'USER_EXISTS');
      }

      const user = new User({
        username,
        email: email.toLowerCase(),
        password,
        fullName,
        role: role || 'reviewer'
      });

      await user.save();
      const token = generateToken(user);

      return ApiResponse.success(
        res,
        {
          token,
          user: user.toSafeObject()
        },
        'Registration successful',
        201
      );
    } catch (err) {
      return ApiResponse.error(res, 'Error during registration', 500, err.message);
    }
  }

  static async login(req, res) {
    try {
      const { usernameOrEmail, password } = req.body;

      const user = await User.findOne({
        $or: [
          { email: usernameOrEmail.toLowerCase() },
          { username: usernameOrEmail }
        ]
      });

      if (!user) {
        return ApiResponse.error(res, 'Invalid credentials.', 401, null, 'INVALID_CREDENTIALS');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return ApiResponse.error(res, 'Invalid credentials.', 401, null, 'INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        return ApiResponse.error(res, 'Account is deactivated. Please contact an administrator.', 403, null, 'ACCOUNT_INACTIVE');
      }

      const token = generateToken(user);

      return ApiResponse.success(
        res,
        {
          token,
          user: user.toSafeObject()
        },
        'Login successful'
      );
    } catch (err) {
      return ApiResponse.error(res, 'Error during login', 500, err.message);
    }
  }

  static async getMe(req, res) {
    return ApiResponse.success(res, req.user.toSafeObject(), 'Profile retrieved');
  }
}

module.exports = AuthController;
