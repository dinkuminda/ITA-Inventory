-- Clean start: Drop existing tables to ensure schema consistency
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.maintenance;
DROP TABLE IF EXISTS public.assets;
DROP TABLE IF EXISTS public.licenses;
DROP TABLE IF EXISTS public.employees;
DROP TABLE IF EXISTS public.profiles;

-- 1. Create PROFILES table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT DEFAULT 'Staff',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create ASSETS table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial_number TEXT UNIQUE,
  status TEXT DEFAULT 'In Stock',
  assigned_to TEXT,
  roles TEXT,
  location TEXT,
  specific_location TEXT,
  date TEXT,
  remark TEXT,
  approval_status TEXT DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create LICENSES table
CREATE TABLE public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor TEXT,
  type TEXT,
  key TEXT UNIQUE,
  seats INTEGER DEFAULT 1,
  used_seats INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  assigned_to TEXT,
  department TEXT,
  expiry_date TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create MAINTENANCE table
CREATE TABLE public.maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  action_taken TEXT,
  performed_by TEXT,
  cost DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Completed',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create EMPLOYEES table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  department TEXT,
  position TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  role TEXT DEFAULT 'Staff',
  status TEXT DEFAULT 'Active',
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. AUDIT_LOGS table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all access for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.assets FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.licenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.maintenance FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable read for everyone to validate emails" ON public.employees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.audit_logs FOR ALL TO authenticated USING (true);
