-- VEILIGE UPDATE voor bestaande users tabel
-- Voegt alleen ontbrekende kolommen toe zonder bestaande data te vernietigen

-- Controleer eerst of de tabel bestaat
DO $$ 
BEGIN
    -- Voeg ontbrekende kolommen toe als ze niet bestaan
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email') THEN
        ALTER TABLE public.users ADD COLUMN email varchar;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        ALTER TABLE public.users ADD COLUMN password_hash varchar;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    
    -- Maak gender enum type als het niet bestaat
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender') THEN
        CREATE TYPE public.gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
    END IF;
    
    -- Update gender kolom naar enum type als het nog text is
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'gender' AND data_type = 'text') THEN
        ALTER TABLE public.users ALTER COLUMN gender TYPE public.gender USING gender::public.gender;
    END IF;
    
    RAISE NOTICE 'Users table safely updated with missing columns';
END $$;
