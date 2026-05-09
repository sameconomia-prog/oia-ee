"""CLI del RAG indexer/retriever.

Uso:
    python -m pipeline.agents.rag.cli index
    python -m pipeline.agents.rag.cli query "contaduría obsolescencia"
    python -m pipeline.agents.rag.cli query "rectores benchmark" --k 3
    python -m pipeline.agents.rag.cli stats
"""
from __future__ import annotations
import argparse
import sys

from pipeline.agents.rag.indexer import build_index
from pipeline.agents.rag.retriever import search
from pipeline.agents.rag.store import index_stats


def main() -> int:
    ap = argparse.ArgumentParser(prog="rag")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("index", help="(re)indexar todos los MDX")
    sub.add_parser("stats", help="info del índice actual")

    qp = sub.add_parser("query", help="buscar top-k chunks")
    qp.add_argument("text", nargs="+", help="query libre")
    qp.add_argument("--k", type=int, default=5)

    args = ap.parse_args()

    if args.cmd == "index":
        try:
            build_index()
            return 0
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            return 1

    if args.cmd == "stats":
        s = index_stats()
        for k, v in s.items():
            print(f"{k}: {v}")
        return 0

    if args.cmd == "query":
        q = " ".join(args.text)
        try:
            hits = search(q, k=args.k)
        except FileNotFoundError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            return 2
        for i, h in enumerate(hits, 1):
            print(f"\n[{i}] score={h['score']:.4f}  slug={h['slug']}  section={h['section_title']!r}")
            print(f"    {h['content'][:240].replace(chr(10), ' ')}…")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
