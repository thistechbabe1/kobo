/**
 * Zod validation schemas for API inputs including authentication, account resolution,
 * transfer authorization (4-digit numeric PIN, never stored), and beneficiary management.
 */
import { z } from 'zod';

/**
 * Authentication login request payload schema.
 */
export const LoginInputSchema = z.object({
  email: z
    .string({ required_error: 'Email address is required' })
    .trim()
    .min(1, 'Email address is required')
    .email('Invalid email address format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

/**
 * Account name resolution request payload schema.
 */
export const ResolveAccountInputSchema = z.object({
  accountNumber: z
    .string({ required_error: 'Account number is required' })
    .trim()
    .regex(/^\d{10}$/, 'Account number must be exactly 10 digits'),
  bankCode: z
    .string({ required_error: 'Bank selection is required' })
    .trim()
    .min(1, 'Bank selection is required')
    .max(6, 'Bank code must not exceed 6 characters'),
});

export type ResolveAccountInput = z.infer<typeof ResolveAccountInputSchema>;

/**
 * Wallet transfer debit request payload schema.
 * Accepts either `amountKobo` (integer Kobo) or legacy `amount` (integer Kobo).
 */
export const TransferInputSchema = z
  .object({
    accountNumber: z
      .string({ required_error: 'Account number is required' })
      .trim()
      .regex(/^\d{10}$/, 'Valid 10-digit account number is required'),
    bankCode: z
      .string({ required_error: 'Bank selection is required' })
      .trim()
      .min(1, 'Bank selection is required')
      .max(6, 'Bank code must not exceed 6 characters'),
    bankName: z
      .string()
      .trim()
      .max(100, 'Bank name must not exceed 100 characters')
      .optional(),
    recipientName: z
      .string({ required_error: 'Recipient name is required' })
      .trim()
      .min(1, 'Recipient name is required')
      .max(100, 'Recipient name must not exceed 100 characters'),
    amount: z.number().int('Transfer amount must be an integer in Kobo').positive('Transfer amount must be a positive integer in Kobo').optional(),
    amountKobo: z.number().int('Transfer amount must be an integer in Kobo').positive('Transfer amount must be a positive integer in Kobo').optional(),
    narration: z
      .string()
      .trim()
      .max(100, 'Narration must not exceed 100 characters')
      .optional(),
    pin: z
      .string({ required_error: 'PIN is required' })
      .trim()
      .regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
    idempotencyKey: z
      .string({ required_error: 'Idempotency-Key is required' })
      .trim()
      .min(1, 'Idempotency-Key is required to prevent duplicate transfers')
      .max(100, 'Idempotency key must not exceed 100 characters'),
  })
  .refine(
    (data) => typeof data.amountKobo === 'number' || typeof data.amount === 'number',
    {
      message: 'Transfer amount must be a positive integer in Kobo',
      path: ['amountKobo'],
    }
  );

export type TransferInput = z.infer<typeof TransferInputSchema>;

/**
 * Beneficiary query parameter schema for deletion.
 */
export const DeleteBeneficiaryQuerySchema = z.object({
  id: z
    .preprocess(
      (val) => (val === null || val === undefined ? '' : String(val).trim()),
      z.string().min(1, 'Beneficiary ID is required')
    ),
});

export type DeleteBeneficiaryQuery = z.infer<typeof DeleteBeneficiaryQuerySchema>;
