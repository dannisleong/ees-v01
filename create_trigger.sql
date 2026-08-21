CREATE OR REPLACE FUNCTION trg_customer_deposits_ssot()
RETURNS TRIGGER AS $$
DECLARE
  v_target_order_id TEXT;
  v_old_order_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_target_order_id := OLD.order_id;
    v_old_order_id := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    v_target_order_id := NEW.order_id;
    IF OLD.order_id IS DISTINCT FROM NEW.order_id THEN
      v_old_order_id := OLD.order_id;
    ELSE
      v_old_order_id := NULL;
    END IF;
  ELSE
    v_target_order_id := NEW.order_id;
    v_old_order_id := NULL;
  END IF;

  PERFORM recalculate_order_payment_status(v_target_order_id);

  IF v_old_order_id IS NOT NULL THEN
    PERFORM recalculate_order_payment_status(v_old_order_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_deposits_ssot
  AFTER INSERT OR UPDATE OR DELETE ON customer_deposits
  FOR EACH ROW
  EXECUTE FUNCTION trg_customer_deposits_ssot();
