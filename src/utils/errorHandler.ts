/**
 * StockSense Error Handler Utility
 * Translates raw Supabase / PostgreSQL errors and runtime exceptions 
 * into clear, user-friendly natural language messages.
 * Prevents exposing SQL queries, internal stack traces, database schema, or tokens.
 */

export function parseErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const errObj = typeof error === 'string' ? { message: error } : (error as any);
  const msg = errObj.message || errObj.error_description || '';
  const code = errObj.code || '';

  // 1. PostgreSQL Error Codes Mapping
  if (code === '23505') {
    if (msg.includes('products_sku_key') || msg.includes('sku')) {
      return 'A product with this SKU already exists. Please use a unique SKU code.';
    }
    if (msg.includes('categories_name_key') || msg.includes('categories_code_key')) {
      return 'A category with this name or code already exists.';
    }
    if (msg.includes('warehouses_code_key')) {
      return 'A warehouse with this code already exists.';
    }
    if (msg.includes('unique_location_code_per_warehouse')) {
      return 'A location with this code already exists in the selected warehouse.';
    }
    if (msg.includes('reference')) {
      return 'An operation document with this reference number already exists.';
    }
    return 'A duplicate record with the same unique identifier already exists.';
  }

  if (code === '23503') {
    if (msg.includes('warehouse_id')) {
      return 'The selected warehouse is invalid or no longer exists.';
    }
    if (msg.includes('location_id')) {
      return 'The selected location is invalid or no longer exists.';
    }
    if (msg.includes('product_id')) {
      return 'One of the selected products is invalid or no longer exists.';
    }
    return 'This operation cannot be completed because a referenced record was not found or is in use.';
  }

  if (code === '23514') {
    if (msg.includes('check_stock_on_hand_non_negative') || msg.includes('on_hand')) {
      return 'Inventory stock quantity cannot be negative.';
    }
    if (msg.includes('cost_price') || msg.includes('sale_price')) {
      return 'Prices must be zero or a positive numeric value.';
    }
    if (msg.includes('quantity')) {
      return 'Item quantities must be greater than zero.';
    }
    return 'Data validation failed. Please check that all numeric inputs are non-negative.';
  }

  if (code === '42501' || msg.includes('row-level security') || msg.includes('RLS')) {
    return 'You do not have permission to perform this inventory action.';
  }

  // 2. Custom Business Logic RPC Errors (from complete_* functions)
  if (msg.includes('Insufficient stock')) {
    return msg; // Already clean RPC error
  }
  if (msg.includes('already completed') || msg.includes('already validated')) {
    return 'This operation document is already completed and validated.';
  }
  if (msg.includes('canceled')) {
    return 'Cannot complete or modify a canceled operation document.';
  }
  if (msg.includes('does not belong to')) {
    return msg; // Clean location verification RPC error
  }
  if (msg.includes('cannot have their status reversed')) {
    return 'Completed documents cannot have their status reversed.';
  }

  // 3. Auth & Network Errors
  if (msg.includes('Invalid login credentials')) {
    return 'Invalid email address or password. Please try again.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Your email address has not been verified yet.';
  }
  if (msg.includes('User already registered')) {
    return 'An account with this email address already exists.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('network')) {
    return 'Network connection error. Please check your internet connection.';
  }

  // Sanitized fallback (remove any raw SQL or stack trace patterns)
  const sanitized = msg
    .replace(/SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CONSTRAINT|pg_catalog|public\./gi, '')
    .trim();

  if (sanitized && sanitized.length < 150 && !sanitized.includes('at ')) {
    return sanitized;
  }

  return 'An error occurred while processing your request. Please check input fields and retry.';
}

/**
 * Standard Email Validation
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Positive Numeric Input Validation
 */
export function isValidPositiveNumber(val: any): boolean {
  const num = Number(val);
  return !isNaN(num) && num >= 0;
}

/**
 * Strictly Greater Than Zero Quantity Validation
 */
export function isValidQuantity(val: any): boolean {
  const num = Number(val);
  return !isNaN(num) && num > 0;
}
