# Sentinel Demo

A premium-feeling demo application showcasing AI governance and policy enforcement.

## Project Structure

```
sentinel-demo/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # FastAPI backend
├── shared/
│   └── types/        # Shared TypeScript types
├── supabase/
│   └── migrations/   # SQL migrations
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account and project

### 1. Database Setup (Supabase)

1. Create a new Supabase project
2. Open the SQL Editor
3. Run the migration from `supabase/migrations/001_initial_schema.sql`
4. This creates:
   - `runs` table
   - `run_events` table
   - `policies` table (with seed data)
   - Required indexes

### 2. Backend Setup

```bash
cd apps/api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your Supabase credentials:
# SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# CORS_ORIGINS=http://localhost:5173
# DEMO_MODE=true

# Run the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd apps/web

# Install dependencies
npm install

# Create .env file (optional, defaults to http://localhost:8000)
echo "VITE_API_BASE_URL=http://localhost:8000" > .env

# Run development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

### Creating a Run

1. Navigate to `/` (RunCreate screen)
2. Select input type: Chat, File, or Code
3. Optionally select a scenario for deterministic demo results:
   - **PII Chat**: Detects and redacts SSN/phone numbers
   - **Compensation File**: Summarizes CSV data, redacts individual salaries
   - **Code Secret**: Redacts API keys and secrets
   - **Injection**: Blocks prompt injection attempts
4. Enter content and click "Run"
5. View results on `/runs/:id`

### Viewing Results

- **User View** (`/runs/:id`): Clean output with "Why?" toggle for annotations
- **Admin View** (`/admin/runs/:id`): Full evidence, timeline, and export options
  - Access via `?admin=1` query param on run result page, or direct URL

### Policy Pack

- View all policies at `/admin/policies`
- Read-only for now (editing coming soon)

## Demo Scenarios

The backend includes stub logic that generates deterministic results based on scenario:

1. **pii_chat**: Redacts SSN and phone numbers
2. **file_comp**: Summarizes compensation data
3. **code_secret**: Redacts API keys and secrets
4. **injection**: Blocks suspicious prompts

## API Endpoints

- `POST /v1/runs` - Create a new run
- `GET /v1/runs/{run_id}` - Get run details
- `GET /v1/runs/{run_id}/export` - Export full run data
- `GET /v1/policies` - List all policies
- `GET /health` - Health check

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.10+
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify (FE), Fly.io (BE) - configured later

## Development Notes

- No authentication required (demo mode)
- No RLS policies (backend-only Supabase access)
- Stub logic generates deterministic results
- No OpenAI calls yet (pure demo scaffolding)

## Next Steps

- Wire up real file uploads
- Add policy engine integration
- Implement policy editing
- Add authentication
- Deploy to production
