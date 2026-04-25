-- ============================================================================
-- AUDIT LOGGING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to log audit events
CREATE OR REPLACE FUNCTION audit_table_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, table_name, action, old_values)
    VALUES (auth.uid(), TG_TABLE_NAME, 'DELETE', row_to_json(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, table_name, action, old_values, new_values)
    VALUES (auth.uid(), TG_TABLE_NAME, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, table_name, action, new_values)
    VALUES (auth.uid(), TG_TABLE_NAME, 'INSERT', row_to_json(NEW));
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER IF NOT EXISTS audit_baby_photos AFTER INSERT OR UPDATE OR DELETE ON baby_photos
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER IF NOT EXISTS audit_doctor_reports AFTER INSERT OR UPDATE OR DELETE ON doctor_reports
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

CREATE TRIGGER IF NOT EXISTS audit_health_records AFTER INSERT OR UPDATE OR DELETE ON health_records
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
