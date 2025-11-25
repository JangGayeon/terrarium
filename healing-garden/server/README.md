Garden AI backend (sample)

This is a very small Express server that sends terrarium sensor data to OpenAI and returns structured recommendations.

Quick start (Windows PowerShell):

1. open a terminal in server folder

```powershell
Set-Location 'D:\GY\test\terrarium\healing-garden\server'
npm install
# set your OpenAI API key in the environment (PowerShell)
$env:OPENAI_API_KEY = 'sk-...'
node index.js
```

2. In the client app (`healing-garden`), call POST http://localhost:3000/evaluate with JSON { name, plantType, temp, hum, lux }.

Security notes:
- Never embed your API key in frontend code. Keep it server-side.
- Add authentication and rate-limiting before exposing this server publicly.
- For production, use a proper backend (HTTPS, verified auth, request validation).
