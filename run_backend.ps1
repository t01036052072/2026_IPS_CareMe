Set-Location -Path $PSScriptRoot\BackEnd
& ..\.venv\Scripts\python.exe -m uvicorn practice.mainjeong:app --host 0.0.0.0 --port 8000 --reload
