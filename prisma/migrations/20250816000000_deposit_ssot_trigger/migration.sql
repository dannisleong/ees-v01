-- Migration: Deposit SSOT Trigger (Rev.1.2)
-- This trigger maintains customer_orders.payment_status as a derived value
-- from customer_deposits. customer_deposits remains the single source of truth.

-- Helper function: recalculate payment_status for a given order_id
CREATE OR REPLACE FUNCTION recalculate_order_payment_status(p_order_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_order_amount DECIMAL(15,2);
  v_deposit_required DECIMAL(15,2);
  v_total_deposits DECIMAL(15,2);
BEGIN
  -- Fetch order amounts
  SELECT order_amount, deposit_required
  INTO v_order_amount, v_deposit_required
  FROM customer_orders
  WHERE id = p_order_id;

  -- If order does not exist, nothing to do
  IF v_order_amount IS NULL THEN
    RETURN;
  END IF;

  -- Sum all deposits for this order
  SELECT COALESCE(SUM(deposit_amount), 0)
  INTO v_total_deposits
  FROM customer_deposits
  WHERE order_id = p_order_id;

  -- Update the derived payment_status (SSOT rules)
  UPDATE customer_orders
  SET payment_status = CASE
    WHEN v_total_deposits >= v_order_amount THEN 'fully_paid'
    WHEN v_total_deposits >= v_deposit_required THEN 'deposit_received'
    WHEN v_total_deposits > 0 THEN 'partial_deposit'
    ELSE 'pending_deposit'
  END
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Main trigger function: handles INSERT, UPDATE, DELETE on customer_deposits
CREATE OR REPLACE FUNCTION trg_customer_deposits_ssot()
RETURNS TRIGGER AS $$
DECLARE
  v_target_order_id TEXT;
  v_old_order_id TEXT;
BEGIN
  -- Determine which order(s) need recalculation
  IF TG_OP = 'DELETE' THEN
    v_target_order_id := OLD.order_id;
    v_old_order_id := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_target_order_id := NEW.order_id;
    -- If order_id changed, also recalculate the old order
    IF OLD.order_id IS DISTINCT FROM NEW.order_id THEN
      v_old_order_id := OLD.order_id;
    ELSE
      v_old_order_id := NULL;
    END IF;
  ELSE -- INSERT
    v_target_order_id := NEW.order_id;
    v_old_order_id := NULL;
  END IF;

  -- Recalculate primary (current/new) order
  PERFORM recalculate_order_payment_status(v_target_order_id);

  -- If order_id changed on UPDATE, recalculate the old order too
  IF v_old_order_id IS NOT NULL THEN
    PERFORM recalculate_order_payment_status(v_old_order_id);
  END IF;

  -- Return appropriate row
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to customer_deposits
DROP TRIGGER IF EXISTS trg_customer_deposits_ssot ON customer_deposits;
CREATE TRIGGER trg_customer_deposits_ssot
  AFTER INSERT OR UPDATE OR DELETE ON customer_deposits
  FOR EACH ROW
  EXECUTE FUNCTION trg_customer_deposits_ssot();

-- Add comment for documentation
COMMENT ON FUNCTION trg_customer_deposits_ssot() IS
  'Deposit SSOT trigger: customer_deposits is the single source of truth.\n'
  'This trigger automatically updates customer_orders.payment_status on any\n'
  'INSERT, UPDATE, or DELETE of customer_deposits.\n'
  'Rules: >= order_amount -> fully_paid; >= deposit_required -> deposit_received;\n'
  '> 0 -> partial_deposit; else -> pending_deposit.';
