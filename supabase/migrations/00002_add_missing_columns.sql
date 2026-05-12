
-- Add missing columns to neural_nodes
ALTER TABLE neural_nodes
  ADD COLUMN status text NOT NULL DEFAULT 'dim' CHECK (status IN ('dim','active','cocoon','butterfly')),
  ADD COLUMN ghost_content text,
  ADD COLUMN version integer NOT NULL DEFAULT 1;

-- Add missing column to light_fragments
ALTER TABLE light_fragments
  ADD COLUMN last_reviewed_at timestamptz;

-- Add link_word alias column to neural_connections (same as relation_word for compatibility)
ALTER TABLE neural_connections
  ADD COLUMN link_word text;

-- Backfill link_word from relation_word
UPDATE neural_connections SET link_word = relation_word WHERE link_word IS NULL;

-- Add insert trigger to keep link_word in sync
CREATE OR REPLACE FUNCTION sync_link_word()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.link_word IS NULL THEN
    NEW.link_word := NEW.relation_word;
  END IF;
  IF NEW.relation_word IS NULL THEN
    NEW.relation_word := NEW.link_word;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_link_word
BEFORE INSERT OR UPDATE ON neural_connections
FOR EACH ROW EXECUTE FUNCTION sync_link_word();
