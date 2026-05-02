-- 1. Create PROFILES table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT DEFAULT 'Staff',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create ASSETS table
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  "serialNumber" TEXT UNIQUE,
  status TEXT DEFAULT 'In Stock',
  "assignedTo" TEXT,
  roles TEXT,
  location TEXT,
  date TEXT,
  remark TEXT,
  notes TEXT,
  "approvalStatus" TEXT DEFAULT 'Pending',
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create LICENSES table
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vendor TEXT,
  type TEXT,
  "key" TEXT UNIQUE,
  seats INTEGER DEFAULT 1,
  "usedSeats" INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  "assignedTo" TEXT,
  department TEXT,
  "expiryDate" TEXT,
  notes TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create MAINTENANCE table
CREATE TABLE IF NOT EXISTS public.maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "assetId" UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  "issueDescription" TEXT NOT NULL,
  "actionTaken" TEXT,
  "performedBy" TEXT,
  "cost" DECIMAL(10,2) DEFAULT 0,
  "status" TEXT DEFAULT 'Completed',
  "date" DATE DEFAULT CURRENT_DATE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create EMPLOYEES table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" TEXT UNIQUE,
  "fullName" TEXT NOT NULL,
  email TEXT UNIQUE,
  department TEXT,
  position TEXT,
  "joinDate" DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Active',
  "profileId" UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. AUDIT_LOGS table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic Policies (Allow all authenticated users for MVP, can be hardened later)
CREATE POLICY "Enable all access for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.assets FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.licenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.maintenance FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all access for authenticated users" ON public.audit_logs FOR ALL TO authenticated USING (true);
