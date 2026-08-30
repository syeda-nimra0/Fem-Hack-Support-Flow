import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models.js';
import { signToken, requireAuth, asyncHandler } from '../auth.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};
    const errors = {};
    if (!name || String(name).trim().length < 2) errors.name = 'Please enter your full name.';
    if (!email || !EMAIL_RE.test(String(email))) errors.email = 'Please enter a valid email address.';
    if (!password || String(password).length < 8) errors.password = 'Password must be at least 8 characters.';
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', fields: errors });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        error: 'An account with this email already exists.',
        fields: { email: 'This email is already registered.' },
      });
    }

    const palette = ['#3368A0', '#66A3BF', '#4E8D6E', '#B98A2F', '#7A6AAE'];
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(String(password), 10),
      role: 'customer', // public registration is customer-only; agents are provisioned by admins
      avatarColor: palette[Math.floor(Math.random() * palette.length)],
    });

    res.status(201).json({ token: signToken(user), user: user.toPublic() });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    res.json({ token: signToken(user), user: user.toPublic() });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    res.json({ user: user.toPublic() });
  })
);

// ---------------------------------------------------------------------------
// Profile settings — update name, phone, company, location, bio
// ---------------------------------------------------------------------------
router.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, phone, company, location, bio } = req.body || {};
    const updates = {};
    const fields = {};

    if (name !== undefined) {
      const clean = String(name).trim();
      if (clean.length < 2 || clean.length > 80) {
        fields.name = 'Name must be 2-80 characters.';
      } else {
        updates.name = clean;
      }
    }
    if (phone !== undefined) {
      const clean = String(phone).trim();
      if (clean.length > 24) fields.phone = 'Phone number is too long (max 24).';
      else updates.phone = clean;
    }
    if (company !== undefined) {
      const clean = String(company).trim();
      if (clean.length > 60) fields.company = 'Company is too long (max 60).';
      else updates.company = clean;
    }
    if (location !== undefined) {
      const clean = String(location).trim();
      if (clean.length > 60) fields.location = 'Location is too long (max 60).';
      else updates.location = clean;
    }
    if (bio !== undefined) {
      const clean = String(bio).trim();
      if (clean.length > 280) fields.bio = 'Bio is too long (max 280 characters).';
      else updates.bio = clean;
    }
    if (Object.keys(fields).length) {
      return res.status(400).json({ error: 'Validation failed.', fields });
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    res.json({ user: user.toPublic() });
  })
);

// ---------------------------------------------------------------------------
// Profile settings — change password (requires current password)
// ---------------------------------------------------------------------------
router.patch(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({
        error: 'Validation failed.',
        fields: { newPassword: 'Password must be at least 8 characters.' },
      });
    }

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });

    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) {
      return res.status(400).json({
        error: 'Your current password is incorrect.',
        fields: { currentPassword: 'Incorrect password.' },
      });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    res.json({ ok: true, message: 'Password updated. Please use it the next time you sign in.' });
  })
);

export default router;
