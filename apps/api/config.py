import os
from pathlib import Path


def find_repo_root(start: Path | None = None) -> Path:
    cur = (start or Path.cwd()).resolve()
    for _ in range(8):
        if (cur / "pnpm-workspace.yaml").exists() or (cur / "storage").is_dir():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return Path.cwd().resolve()


REPO_ROOT = find_repo_root()
STORAGE_DIR = REPO_ROOT / "storage"
PAPERS_DIR = STORAGE_DIR / "papers"
EMBEDDINGS_DIR = STORAGE_DIR / "embeddings"
DB_PATH = Path(os.getenv("DATABASE_PATH", str(STORAGE_DIR / "researchos.db")))
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.2")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

PAPERS_DIR.mkdir(parents=True, exist_ok=True)
EMBEDDINGS_DIR.mkdir(parents=True, exist_ok=True)
