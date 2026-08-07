FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm

# Install Python 3.12 and SQLite3
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    libsqlite3-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm and uv
RUN npm install -g pnpm@9
RUN curl -sSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.cargo/bin:${PATH}"
