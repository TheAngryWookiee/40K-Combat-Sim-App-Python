# 40K Combat Sim

## Backend

Install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Run the API:

```powershell
uvicorn api:app --reload
```

API endpoints:

- `GET /health`
- `GET /factions`
- `GET /factions/{faction_name}`
- `GET /factions/{faction_name}/units`
- `GET /factions/{faction_name}/units/{unit_name}`
- `POST /simulate`

Run the CLI:

```powershell
python "40k Project 2.0.py"
```

## React Frontend Setup

Recommended stack:

- React
- Vite
- TypeScript

Create the frontend:

```powershell
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install axios react-router-dom
npm run dev
```

React dev server runs on `http://localhost:5173`, which is already allowed by the API CORS config.

Suggested frontend shape:

- `src/api/` for REST calls
- `src/pages/SimulatorPage.tsx`
- `src/components/UnitPicker.tsx`
- `src/components/CombatLog.tsx`
- `src/components/SimulationOptions.tsx`

Typical dev flow:

1. Start `uvicorn api:app --reload`
2. Start `npm run dev` inside `frontend`
3. Call the backend from React at `http://localhost:8000`
