-- Safely ensure public.shop_type enum contains all required labels used by the app
-- This migration is idempotent: it creates the enum if missing and adds any missing values.

DO $$
BEGIN
  -- Create the enum type if it doesn't exist yet
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.shop_type AS ENUM (
      'FASHION',
      'BIKES',
      'SHOES',
      'MOTORS',
      'GLASSES',
      'JEWELRY',
      'WATCHES',
      'AUTOMOTIVE',
      'FURNITURE',
      'BAGS'
    );
  END IF;
END $$;

-- Add missing enum values if they don't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'FASHION'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'FASHION';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'BIKES'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'BIKES';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'SHOES'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'SHOES';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'MOTORS'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'MOTORS';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'GLASSES'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'GLASSES';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'JEWELRY'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'JEWELRY';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'WATCHES'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'WATCHES';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'AUTOMOTIVE'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'AUTOMOTIVE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'FURNITURE'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'FURNITURE';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'shop_type'
      AND t.typnamespace = 'public'::regnamespace
      AND e.enumlabel = 'BAGS'
  ) THEN
    ALTER TYPE public.shop_type ADD VALUE 'BAGS';
  END IF;
END $$;
