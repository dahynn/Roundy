FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=2

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN groupadd --system roundy \
    && useradd --system --gid roundy --create-home roundy \
    && chown -R roundy:roundy /app \
    && chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]

CMD ["gunicorn", "--chdir", "src", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "4", "--timeout", "120", "main:app"]
