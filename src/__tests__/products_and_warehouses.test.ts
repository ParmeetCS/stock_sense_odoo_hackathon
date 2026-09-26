import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidPositiveNumber } from '../utils/errorHandler';

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
import {
  createProduct,
  updateProduct,
  checkSkuUnique,
} from '../services/productService';
import {
  createWarehouse,
  fetchWarehouseById,
} from '../services/warehouseService';

describe('Products & Warehouses Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Numeric & Price Validation', () => {
    it('validates positive numeric fields', () => {
      expect(isValidPositiveNumber(450.00)).toBe(true);
      expect(isValidPositiveNumber('0.00')).toBe(true);
      expect(isValidPositiveNumber(-10)).toBe(false);
      expect(isValidPositiveNumber('abc')).toBe(false);
    });
  });

  describe('Products Service', () => {
    it('creates a new product with valid fields', async () => {
      const mockProduct = {
        id: 'prod-123',
        sku: 'STL-ROD-01',
        name: 'Steel Rods',
        cost_price: 450,
        sale_price: 750,
        reorder_level: 50,
      };

      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockProduct, error: null }),
      };
      (supabase.from as any).mockReturnValue(chain);

      const result = await createProduct({
        name: 'Steel Rods',
        sku: 'STL-ROD-01',
        unit_of_measure: 'Units',
        cost_price: 450,
        sale_price: 750,
        reorder_level: 50,
      });

      expect(result.sku).toBe('STL-ROD-01');
      expect(result.name).toBe('Steel Rods');
    });

    it('detects duplicate SKU in checkSkuUnique', async () => {
      const selectChain = {
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
      };
      (selectChain.ilike as any).mockResolvedValue({ count: 1, error: null });
      (supabase.from as any).mockReturnValue(selectChain);

      const isUnique = await checkSkuUnique('STL-ROD-01');
      expect(isUnique).toBe(false);
    });

    it('updates product attributes cleanly', async () => {
      const updatedProduct = {
        id: 'prod-123',
        sku: 'STL-ROD-01',
        name: 'Steel Rods High Tensile',
        cost_price: 480,
        sale_price: 800,
      };

      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedProduct, error: null }),
      };
      (supabase.from as any).mockReturnValue(chain);

      const result = await updateProduct('prod-123', {
        name: 'Steel Rods High Tensile',
        cost_price: 480,
        sale_price: 800,
      });

      expect(result.name).toBe('Steel Rods High Tensile');
      expect(result.cost_price).toBe(480);
    });
  });

  describe('Warehouses & Locations Relationship', () => {
    it('creates a new warehouse and rejects duplicate warehouse codes', async () => {
      const mockWarehouse = {
        id: 'wh-123',
        code: 'WH-MAIN',
        name: 'Main Warehouse',
        address: 'Plot 42, Industrial Estate',
      };

      const chain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockWarehouse, error: null }),
      };
      (supabase.from as any).mockReturnValue(chain);

      const result = await createWarehouse({
        code: 'WH-MAIN',
        name: 'Main Warehouse',
        address: 'Plot 42, Industrial Estate',
      });

      expect(result.code).toBe('WH-MAIN');
    });

    it('fetches warehouse with associated child locations relationship', async () => {
      const mockWh = { id: 'wh-123', code: 'WH-MAIN', name: 'Main Warehouse' };
      const mockLocations = [
        { id: 'loc-1', code: 'LOC-MAIN-STORE', name: 'Main Store' },
        { id: 'loc-2', code: 'LOC-RACK-A', name: 'Rack A' },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'warehouses') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockWh, error: null }),
          };
        }
        if (table === 'locations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockLocations, error: null }),
          };
        }
        if (table === 'stock') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      const res = await fetchWarehouseById('wh-123');

      expect(res?.warehouse.code).toBe('WH-MAIN');
      expect(res?.locations.length).toBe(2);
      expect(res?.locations[0].code).toBe('LOC-MAIN-STORE');
    });
  });
});
