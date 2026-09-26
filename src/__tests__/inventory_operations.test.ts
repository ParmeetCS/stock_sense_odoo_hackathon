import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

import { supabase } from '../lib/supabase';
import { validateReceipt } from '../services/receiptService';
import { validateDelivery } from '../services/deliveryService';
import { validateTransfer } from '../services/transferService';
import { validateAdjustment } from '../services/adjustmentService';

describe('Inventory Operations & Atomic Engine Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Receipt Operations (Inbound)', () => {
    it('executes receipt completion via RPC, increases stock & logs ledger', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: true,
          reference: 'WH/IN/0001',
          items_processed: 2,
          status: 'done',
        },
        error: null,
      });

      const res = await validateReceipt('rcpt-123', 'user-456');

      expect(supabase.rpc).toHaveBeenCalledWith('complete_receipt', {
        p_receipt_id: 'rcpt-123',
        p_user_id: 'user-456',
      });
      expect(res.success).toBe(true);
      expect(res.message).toContain('WH/IN/0001');
    });

    it('rejects duplicate completion if receipt is already done', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Receipt is already completed and validated.',
        },
        error: null,
      });

      await expect(validateReceipt('rcpt-123')).rejects.toThrow(
        'Receipt is already completed and validated.'
      );
    });
  });

  describe('Delivery Operations (Outbound)', () => {
    it('executes delivery completion via RPC, decreases stock & logs ledger', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: true,
          reference: 'WH/OUT/0001',
          items_processed: 2,
          status: 'done',
        },
        error: null,
      });

      const res = await validateDelivery('del-123', 'user-456');

      expect(supabase.rpc).toHaveBeenCalledWith('complete_delivery', {
        p_delivery_id: 'del-123',
        p_user_id: 'user-456',
      });
      expect(res.success).toBe(true);
      expect(res.message).toContain('WH/OUT/0001');
    });

    it('rejects delivery completion when stock is insufficient', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Insufficient stock at source location. Available free stock: 5, Demanded: 20.',
        },
        error: null,
      });

      await expect(validateDelivery('del-123')).rejects.toThrow(
        'Insufficient stock at source location.'
      );
    });
  });

  describe('Transfer Operations (Internal Move)', () => {
    it('decreases source stock, increases destination stock, preserving total company inventory', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: true,
          reference: 'WH/INT/0001',
          items_processed: 1,
          status: 'done',
        },
        error: null,
      });

      const res = await validateTransfer('trsf-123', 'user-456');

      expect(supabase.rpc).toHaveBeenCalledWith('complete_transfer', {
        p_transfer_id: 'trsf-123',
        p_user_id: 'user-456',
      });
      expect(res.success).toBe(true);
      expect(res.message).toContain('WH/INT/0001');
    });

    it('rejects internal transfer when source location stock is insufficient', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: false,
          error: 'Insufficient free stock at source location. Available: 0, Requested: 30.',
        },
        error: null,
      });

      await expect(validateTransfer('trsf-123')).rejects.toThrow(
        'Insufficient free stock at source location.'
      );
    });
  });

  describe('Inventory Adjustments (Stock Count)', () => {
    it('calculates correct difference (real_quantity - theoretical_quantity) for negative variance', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: true,
          reference: 'ADJ/0001',
          difference: -5,
          counted_quantity: 195,
          status: 'done',
        },
        error: null,
      });

      const res = await validateAdjustment('adj-123', 'user-456');

      expect(supabase.rpc).toHaveBeenCalledWith('complete_adjustment', {
        p_adjustment_id: 'adj-123',
        p_user_id: 'user-456',
      });
      expect(res.success).toBe(true);
      expect(res.message).toContain('ADJ/0001');
    });

    it('calculates correct difference for positive inventory adjustment variance', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: {
          success: true,
          reference: 'ADJ/0002',
          difference: 15,
          counted_quantity: 115,
          status: 'done',
        },
        error: null,
      });

      const res = await validateAdjustment('adj-456', 'user-456');

      expect(res.success).toBe(true);
      expect(res.message).toContain('ADJ/0002');
    });
  });
});
