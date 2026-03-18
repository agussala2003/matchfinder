-- Create the match-evidence storage bucket
INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types")
VALUES ('match-evidence', 'match-evidence', NULL, now(), now(), false, false, NULL, NULL)
ON CONFLICT ("id") DO NOTHING;

-- Policy: Authenticated users can upload objects to match-evidence bucket
CREATE POLICY "Authenticated users can upload match evidence"
ON "storage"."objects"
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'match-evidence' AND
  auth.role() = 'authenticated'
);

-- Policy: Authenticated users can read objects from match-evidence bucket
CREATE POLICY "Authenticated users can read match evidence"
ON "storage"."objects"
FOR SELECT
TO authenticated
USING (
  bucket_id = 'match-evidence' AND
  auth.role() = 'authenticated'
);

-- Policy: Users can delete their own evidence
CREATE POLICY "Users can delete their own match evidence"
ON "storage"."objects"
FOR DELETE
TO authenticated
USING (
  bucket_id = 'match-evidence' AND
  auth.role() = 'authenticated'
);
