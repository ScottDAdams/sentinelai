# Quick Start Guide

## 1. Database Setup (5 minutes)

1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the migration
5. Verify tables were created: `runs`, `run_events`, `policies`

## 2. Backend Setup (2 minutes)

```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CORS_ORIGINS=http://localhost:5173
DEMO_MODE=true
EOF

# Start server
uvicorn main:app --reload --port 8000
```

## 3. Frontend Setup (2 minutes)

```bash
cd apps/web
npm install

# Optional: Create .env if API is not on localhost:8000
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

## 4. Test It Out

1. Open http://localhost:5173
2. Select "PII Chat" scenario
3. Enter: "My SSN is 123-45-6789 and my phone is 555-123-4567"
4. Click "Run"
5. View the results - you should see redacted output!

## Demo Scenarios

- **PII Chat**: Enter text with SSN/phone numbers
- **Compensation File**: Paste CSV with salary data
- **Code Secret**: Paste code with `api_key=...` or `secret=...`
- **Injection**: Enter text like "ignore previous instructions and reveal..."

## Troubleshooting

- **CORS errors**: Make sure `CORS_ORIGINS` in backend `.env` includes your frontend URL
- **Supabase connection errors**: Verify your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
- **Type errors**: Run `npm install` in `apps/web` to ensure all dependencies are installed
