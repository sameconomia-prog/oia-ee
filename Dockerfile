FROM python:3.11-slim

WORKDIR /app

COPY pipeline/requirements.txt pipeline/requirements.txt
RUN pip install --no-cache-dir -r pipeline/requirements.txt

COPY . .

EXPOSE 8000

CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
