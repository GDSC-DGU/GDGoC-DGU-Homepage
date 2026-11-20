FROM python:3.14-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.13.8 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=0
WORKDIR /app
# 의존성 층을 먼저 만들어 소스만 바뀔 때 캐시를 재사용한다
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY app/ app/

FROM python:3.14-slim
RUN useradd --system --no-create-home app
WORKDIR /app
COPY --from=builder /app /app
ENV PATH=/app/.venv/bin:$PATH PYTHONUNBUFFERED=1
USER app
EXPOSE 8000
# Cloud Run은 PORT 환경변수로 포트를 지정한다
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
