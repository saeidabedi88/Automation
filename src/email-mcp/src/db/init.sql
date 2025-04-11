-- Create templates table for storing email response templates
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent VARCHAR(100) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create responses table for storing generated email responses
CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY,
    email_id UUID NOT NULL,
    content TEXT NOT NULL,
    model_used VARCHAR(100),
    token_usage JSONB,
    status VARCHAR(50) NOT NULL,
    intent VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    reviewer_id UUID,
    reviewer_comments TEXT,
    message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_intent ON templates(intent);
CREATE INDEX IF NOT EXISTS idx_responses_email_id ON responses(email_id);
CREATE INDEX IF NOT EXISTS idx_responses_status ON responses(status);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger for the templates table
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 