import argparse
import os
import sys

from pymongo import MongoClient


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify MongoDB without printing credentials.")
    parser.add_argument("--uri", default=os.getenv("MONGODB_URI", ""))
    parser.add_argument("--timeout-ms", type=int, default=10000)
    args = parser.parse_args()

    if not args.uri:
        print("MongoDB check failed: MONGODB_URI is not set.", file=sys.stderr)
        return 2
    if "<db_password>" in args.uri or "URL_ENCODED_PASSWORD" in args.uri:
        print("MongoDB check failed: MONGODB_URI still contains a password placeholder.", file=sys.stderr)
        return 2

    try:
        client = MongoClient(args.uri, serverSelectionTimeoutMS=args.timeout_ms, uuidRepresentation="standard")
        result = client.admin.command("ping")
        client.close()
    except Exception as exc:
        print(f"MongoDB check failed: {type(exc).__name__}. Verify password, URL encoding, and Atlas Network Access.", file=sys.stderr)
        return 1

    if result.get("ok") != 1.0:
        print("MongoDB check failed: Atlas did not acknowledge the ping.", file=sys.stderr)
        return 1
    print("MongoDB connection verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
