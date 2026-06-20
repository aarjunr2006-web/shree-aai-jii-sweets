import { z } from 'zod';

// Roles matching schema.prisma
export const RoleEnum = z.enum(['CUSTOMER', 'WORKER', 'OWNER', 'ADMIN']);
export type Role = z.infer<typeof RoleEnum>;

// Auth Validation
export const CustomerLoginSchema = z.object({
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  otp: z.string().length(6, 'OTP must be 6 digits').optional(), // Optional for initiation, required for verification
});
export type CustomerLoginInput = z.infer<typeof CustomerLoginSchema>;

export const StaffLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type StaffLoginInput = z.infer<typeof StaffLoginSchema>;

export const UserRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: RoleEnum.default('CUSTOMER'),
});
export type UserRegisterInput = z.infer<typeof UserRegisterSchema>;

// Product Validation
export const CreateProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than zero'),
  categoryId: z.string().uuid('Invalid Category ID'),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
});
export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

export const CreateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// Inventory Validation
export const UpdateInventorySchema = z.object({
  branchId: z.string().uuid('Invalid Branch ID'),
  productId: z.string().uuid('Invalid Product ID'),
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
});
export type UpdateInventoryInput = z.infer<typeof UpdateInventorySchema>;

export const DeductInventorySchema = z.object({
  branchId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type DeductInventoryInput = z.infer<typeof DeductInventorySchema>;

// Order Validation
export const PaymentMethodEnum = z.enum(['CASH', 'UPI', 'CARD', 'NETBANKING']);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const OrderStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const CreateOrderItemSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});
export type CreateOrderItemInput = z.infer<typeof CreateOrderItemSchema>;

export const CreateOrderSchema = z.object({
  branchId: z.string().uuid('Invalid Branch ID'),
  customerId: z.string().uuid().optional(),
  paymentMethod: PaymentMethodEnum,
  items: z.array(CreateOrderItemSchema).min(1, 'Order must contain at least 1 item'),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// Razorpay verification
export const RazorpayWebhookSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});
export type RazorpayWebhookInput = z.infer<typeof RazorpayWebhookSchema>;
