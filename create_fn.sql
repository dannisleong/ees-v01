CREATE OR REPLACE FUNCTION recalculate_order_payment_status(p_order_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_order_amount DECIMAL(15,2);
  v_deposit_required DECIMAL(15,2);
  v_total_deposits DECIMAL(15,2);
BEGIN
  SELECT order_amount, deposit_required
  INTO v_order_amount, v_deposit_required
  FROM customer_orders
  WHERE id = p_order_id;

  IF v_order_amount IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(deposit_amount), 0)
  INTO v_total_deposits
  FROM customer_deposits
  WHERE order_id = p_order_id;

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
