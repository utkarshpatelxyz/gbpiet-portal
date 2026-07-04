-- New enum values must be committed before first use, so this migration
-- contains only the enum change.
alter type public.user_role add value if not exists 'hod';
