DROP TRIGGER IF EXISTS trg_customer_deposits_ssot ON customer_deposits;
DROP FUNCTION IF EXISTS trg_customer_deposits_ssot();
DROP FUNCTION IF EXISTS recalculate_order_payment_status(text);
