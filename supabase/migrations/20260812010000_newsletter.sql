CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','UNSUBSCRIBED','BOUNCED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_email_lowercase CHECK (email = lower(email))
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_email_unique ON newsletter_subscribers (lower(email));
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON newsletter_subscribers FROM anon, authenticated;
