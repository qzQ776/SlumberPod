const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://uhddqryjkororlxlqgna.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVoZGRxcnlqa29yb3JseGxxZ25hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDMyODIsImV4cCI6MjA3NzExOTI4Mn0.7430326qr1tuVLFyi8ivxq6PFqHZMVwo3o8xtn4DU3U';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;