-- Create users table for consumer profiles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  date_of_birth DATE,
  gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  profile_photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create fit_sessions table
CREATE TABLE IF NOT EXISTS fit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id VARCHAR(255),
  photo_url TEXT NOT NULL,
  result_url TEXT,
  ai_processing_data JSONB,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for fit_sessions table
ALTER TABLE fit_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON fit_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create sessions
CREATE POLICY "Users can create sessions" ON fit_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Retailers can view sessions for their store
CREATE POLICY "Retailers can view their sessions" ON fit_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM retailers 
      WHERE retailers.id = fit_sessions.retailer_id 
      AND retailers.id = auth.uid()
    )
  );

-- Retailers can update sessions for their store
CREATE POLICY "Retailers can update their sessions" ON fit_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM retailers 
      WHERE retailers.id = fit_sessions.retailer_id 
      AND retailers.id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fit_sessions_user_id ON fit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fit_sessions_retailer_id ON fit_sessions(retailer_id);
CREATE INDEX IF NOT EXISTS idx_fit_sessions_status ON fit_sessions(status);
CREATE INDEX IF NOT EXISTS idx_fit_sessions_created_at ON fit_sessions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fit_sessions_updated_at BEFORE UPDATE ON fit_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
