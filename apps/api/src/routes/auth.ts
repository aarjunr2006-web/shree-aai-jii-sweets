import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@repo/db';
import { UserRegisterSchema, StaffLoginSchema, CustomerLoginSchema } from '@repo/types';
import { validateBody } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'shree_aai_ji_sweets_super_secret_jwt_key_12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'shree_aai_ji_sweets_super_secret_refresh_jwt_key_12345';

// Mock OTP Database for local development
const mockOtpStore = new Map<string, string>();

// Helper to sign access and refresh tokens
const generateTokens = (payload: { id: string; role: string; phone?: string | null; email?: string | null }) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// 1. Send OTP (Customer mock)
router.post('/otp/send', validateBody(CustomerLoginSchema.pick({ phone: true })), async (req, res) => {
  const { phone } = req.body;
  
  // Mock sending OTP
  const mockOtp = '123456';
  mockOtpStore.set(phone, mockOtp);

  console.log(`[SMS MOCK] Sent OTP ${mockOtp} to ${phone}`);
  
  return res.json({
    message: 'OTP sent successfully (MOCK: use 123456)',
    phone,
  });
});

// 2. Verify OTP / Login (Customer mock)
router.post('/otp/verify', validateBody(CustomerLoginSchema), async (req, res) => {
  const { phone, otp } = req.body;

  if (!otp) {
    return res.status(400).json({ error: 'OTP is required' });
  }

  const storedOtp = mockOtpStore.get(phone);
  if (!storedOtp || storedOtp !== otp) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  // Clear OTP on success
  mockOtpStore.delete(phone);

  // Check if customer exists, otherwise create
  let user = await prisma.user.findUnique({
    where: { phone },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        name: `Customer-${phone.substring(phone.length - 4)}`,
        role: 'CUSTOMER',
      },
    });
  }

  const tokens = generateTokens({
    id: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email,
  });

  return res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      phone: user.phone,
    },
    ...tokens,
  });
});

// 3. Email & Password Login (Staff / Owners / Workers)
router.post('/login', validateBody(StaffLoginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const tokens = generateTokens({
    id: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email,
  });

  return res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
    },
    ...tokens,
  });
});

// 4. Register Staff / Customer
router.post('/register', validateBody(UserRegisterSchema), async (req, res) => {
  const { name, phone, email, password, role } = req.body;

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }
  }

  if (phone) {
    const existingPhone = await prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
  }

  let passwordHash: string | undefined;
  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email,
      passwordHash,
      role,
    },
  });

  const tokens = generateTokens({
    id: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email,
  });

  return res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
    },
    ...tokens,
  });
});

export default router;
