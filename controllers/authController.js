const User = require('../models/userSchema');
const validateEmail = require('../utils/emailValidator');
const { sanitizeInput } = require('../utils/sanitizeInput');
const sendMail = require('../utils/sendMail');
const forgotPassTemplate = require('../utils/template');
const validatePassword = require('../utils/validatePassword');
const jwt = require('jsonwebtoken');

// register
const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // Sanitize inputs
    name = sanitizeInput(name);
    email = sanitizeInput(email.toLowerCase());
    password = sanitizeInput(password);

    // Validation
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password)
      return res.status(400).json({ message: 'Password is required' });

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0)
      return res.status(400).json({ errors: passwordErrors });
    if (!validateEmail(email))
      return res.status(400).json({ message: 'Invalid email address' });

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'Email already exists' });

    // Create user
    const user = new User({ name, email, password });
    await user.save();

    // Send response
    res.status(201).json({
      message: 'Registration successful! Please verify your email.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// login
const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Sanitize inputs
    email = sanitizeInput(email.toLowerCase());
    password = sanitizeInput(password);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Use generic error message to prevent user enumeration
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with secure options
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );

    // Set HTTP-only cookie for more secure token storage
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({
      message: 'Login successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

//forget password
const forgetPass = async (req, res) => {
  try {
    let { email } = req.body;

    // Sanitize input
    email = sanitizeInput(email.toLowerCase()); // Normalize email

    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    // Always return same message to prevent email enumeration
    if (!user) return res.status(200).json({ message: 'Email is not valid' });

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store hashed OTP (assuming your schema hashes it automatically like password)
    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    // Send OTP to user's email
    sendMail(
      user.email,
      'Password Reset OTP',
      forgotPassTemplate(user.name, otp)
    );

    res.status(200).json({ message: 'An OTP has been sent' });
  } catch (error) {
    console.error('Forget password error:', error);
    res
      .status(500)
      .json({ message: 'Server error during password reset request' });
  }
};

// verify OTP only (without resetting password)
const verifyOtp = async (req, res) => {
  try {
    let { email, otp } = req.body;

    email = sanitizeInput(email.toLowerCase());
    otp = sanitizeInput(otp);

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Invalid email or OTP' });

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// reset password
const resetPassword = async (req, res) => {
  try {
    let { email, otp, newPassword } = req.body;

    // Sanitize inputs
    email = sanitizeInput(email.toLowerCase());
    otp = sanitizeInput(otp);
    newPassword = sanitizeInput(newPassword);

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate new password strength
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ errors: passwordErrors });
    }

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'Invalid OTP or expired' });

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

const updateUser = async (req, res) => {
  // try {
  let { name, email, password } = req.body;

  // Sanitize inputs
  if (name) name = sanitizeInput(name);
  if (email) email = sanitizeInput(email.toLowerCase());
  if (password) password = sanitizeInput(password);

  // Find logged-in user (from token middleware)
  const userId = req.user.id; // <-- req.user should come from JWT middleware

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Update name
  if (name) user.name = name;

  // Update email
  if (email) {
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    // Check if email already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    user.email = email;
  }

  // Update password
  if (password) {
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ errors: passwordErrors });
    }
    user.password = password;
  }

  await user.save();

  res.status(200).json({
    message: 'User updated successfully',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
  // } catch (error) {
  //   console.error('Update user error:', error);
  //   res.status(500).json({ message: 'Server error during update' });
  // }
};

// logout
const logOut = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = {
  register,
  login,
  forgetPass,
  verifyOtp,
  resetPassword,
  logOut,
  updateUser,
};
