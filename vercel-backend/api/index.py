from fastapi import FastAPI, HTTPException, Header, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FileRequest(BaseModel):
    file_url: str

class PreviewRequest(BaseModel):
    sandbox_id: str
    start_line: int
    end_line: int

class ExecuteRequest(BaseModel):
    sandbox_id: str
    code: str

class SummaryRequest(BaseModel):
    sandbox_id: str
    instruction: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Advanced Data Analyst Backend"}

from e2b_code_interpreter import Sandbox

@app.post("/api/get_file")
def get_file_to_sandbox(
    request: FileRequest,
    x_e2b_api_key: str = Header(...)
):
    try:
        sandbox = Sandbox(api_key=x_e2b_api_key, timeout=300) # Keep alive for 5 minutes

        # Download the file using Python in the sandbox
        code = f"""
import urllib.request
import os

url = "{request.file_url}"
filename = "downloaded_file"
try:
    # Try to extract a sensible filename from URL if possible, or just use a default
    urllib.request.urlretrieve(url, filename)
    file_size = os.path.getsize(filename)

    # Try to count lines for text files
    try:
        with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            line_count = len(lines)
            char_count = sum(len(line) for line in lines)
    except:
        line_count = "unknown"
        char_count = "unknown"

    print(f"File downloaded. Size: {{file_size}} bytes. Estimated lines: {{line_count}}. Estimated chars: {{char_count}}.")
except Exception as e:
    print(f"Error downloading file: {{e}}")
"""
        execution = sandbox.run_code(code)

        # We don't want to close the sandbox here because we need it for subsequent calls.
        # But E2B sandboxes automatically close if the instance is garbage collected.
        # Since this is a serverless function, we MUST return the sandbox_id and rely on
        # the E2B backend to keep it alive based on the timeout, and reconnect to it later.

        return {
            "sandbox_id": sandbox.sandbox_id,
            "metadata": execution.text if execution.text else (execution.error.value if execution.error else "Execution finished without output.")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/preview")
def preview_file_contents(
    request: PreviewRequest,
    x_e2b_api_key: str = Header(...)
):
    try:
        sandbox = Sandbox.connect(request.sandbox_id, api_key=x_e2b_api_key)

        # Extend timeout since we're using it
        sandbox.set_timeout(300)

        # Download the file using Python in the sandbox
        code = f"""
filename = "downloaded_file"
try:
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    start = max(0, {request.start_line} - 1) # 1-indexed to 0-indexed
    end = min(len(lines), {request.end_line})

    preview_lines = lines[start:end]
    print("".join(preview_lines))
except Exception as e:
    print(f"Error reading file: {{e}}")
"""
        execution = sandbox.run_code(code)

        return {
            "preview": execution.text if execution.text else (execution.error.value if execution.error else "Execution finished without output.")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/execute")
def execute_sandbox_code(
    request: ExecuteRequest,
    x_e2b_api_key: str = Header(...)
):
    try:
        sandbox = Sandbox.connect(request.sandbox_id, api_key=x_e2b_api_key)

        # Extend timeout
        sandbox.set_timeout(300)

        execution = sandbox.run_code(request.code)

        return {
            "stdout": execution.text,
            "stderr": execution.error.value if execution.error else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from google import genai
from google.genai import types

@app.post("/api/summary")
def semantic_file_summary(
    request: SummaryRequest,
    x_e2b_api_key: str = Header(...),
    x_gemini_api_key: str = Header(...)
):
    try:
        sandbox = Sandbox.connect(request.sandbox_id, api_key=x_e2b_api_key)

        # Extend timeout
        sandbox.set_timeout(300)

        # Retrieve full file content
        code = """
import sys
filename = "downloaded_file"
try:
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        print(f.read())
except Exception as e:
    print(f"Error reading file: {e}", file=sys.stderr)
"""
        execution = sandbox.run_code(code)

        if execution.error:
            raise Exception(f"Failed to read file in sandbox: {execution.error.value}")

        file_content = execution.text

        if not file_content:
             raise Exception("File is empty or could not be read properly.")

        # Initialize GenAI client
        client = genai.Client(api_key=x_gemini_api_key)

        prompt = f"Instruction: {request.instruction}\n\nFile Content:\n{file_content}"

        response = client.models.generate_content(
            model='gemini-3.1-flash-lite-preview',
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(
                    thinking_tier="medium"
                )
            ),
        )

        return {
            "summary": response.text
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Note: Vercel expects the app to be available.
# To run locally: uvicorn api.index:app --reload
