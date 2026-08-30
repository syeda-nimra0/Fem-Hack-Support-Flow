import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const AVATAR_COLORS = ['#2563eb', '#0d9488', '#9333ea', '#dc2626', '#ea580c', '#16a34a', '#0891b2', '#c026d3'];

function pickAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function sanitizeRole(role) {
  if (!role) return 'customer';
  if (['customer', 'agent', 'admin'].includes(role)) return role;
  return 'customer';
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  // For demo we allow any role selection at signup; in production agents/admins
  // would be provisioned separately. We disable admin self-signup to keep
  // the demo believable.
  const finalRole = sanitizeRole(role) === 'admin' ? 'customer' : sanitizeRole(role);

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: finalRole,
    avatarColor: pickAvatarColor(),
  });

  const token = signToken(user._id.toString());
  res.status(201).json({
    message: 'Account created successfully',
    token,
    user: user.toJSON(),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (!user.isActive) {
    return res.status(403).json({ message: 'Account is deactivated. Contact an administrator.' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = signToken(user._id.toString());
  res.json({
    message: 'Login successful',
    token,
    user: user.toJSON(),
  });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatarColor } = req.body;
  const user = req.user;

  if (name) user.name = name.trim();
  if (avatarColor) user.avatarColor = avatarColor;

  await user.save();
  res.json({ message: 'Profile updated', user: user.toJSON() });
});

// Helper to create demo accounts (used by seed script)
export async function createDemoUser({ name, email, password, role, specialties = [] }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(password, 12);
  return User.create({
    name,
    email,
    password: hashedPassword,
    role,
    avatarColor: pickAvatarColor(),
    specialties,
  });
}

// Re-export nanoid for ticket number generation in routes
export { nanoid };
