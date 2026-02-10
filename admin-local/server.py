from pathlib import Path
import json
from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parents[1]
ADMIN_DIR = Path(__file__).resolve().parent
DOCS_DIR = BASE_DIR / "docs"
REVIEWS_PATH = DOCS_DIR / "js" / "reviews.json"
COVERS_DIR = DOCS_DIR / "covers"

app = Flask(__name__)


def load_reviews():
    if not REVIEWS_PATH.exists():
        return []
    with REVIEWS_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_reviews(reviews):
    REVIEWS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with REVIEWS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(reviews, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def next_id(reviews):
    return max((int(r.get("id", 0)) for r in reviews), default=0) + 1


def safe_ext(filename):
    if not filename or "." not in filename:
        return "jpg"
    ext = filename.rsplit(".", 1)[-1].lower()
    if not ext.isalnum():
        return "jpg"
    return ext


@app.get("/admin")
def admin_index():
    return send_from_directory(ADMIN_DIR, "admin.html")


@app.get("/admin.<path:filename>")
def admin_assets(filename):
    return send_from_directory(ADMIN_DIR, f"admin.{filename}")


@app.get("/favicon.ico")
def favicon():
    return "", 204


@app.get("/docs/<path:filename>")
def docs_assets(filename):
    return send_from_directory(DOCS_DIR, filename)


@app.get("/api/next")
def api_next():
    reviews = load_reviews()
    return jsonify({"count": len(reviews), "nextId": next_id(reviews)})


@app.post("/api/reviews")
def api_reviews():
    form = request.form
    artist = (form.get("artist") or "").strip()
    album = (form.get("album") or "").strip()
    release_date = (form.get("releaseDate") or "").strip()
    review = (form.get("review") or "").strip()
    cover_file = request.files.get("cover")

    if not artist or not album or not review:
        return jsonify({"error": "Artist, album, and review are required."}), 400

    if cover_file is None:
        return jsonify({"error": "Cover file is required."}), 400

    reviews = load_reviews()
    new_id = next_id(reviews)
    ext = safe_ext(cover_file.filename)

    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    cover_filename = f"{new_id}.{ext}"
    cover_path = COVERS_DIR / cover_filename
    cover_file.save(cover_path)

    entry = {
        "id": new_id,
        "artist": artist,
        "album": album,
        "releaseDate": release_date,
        "cover": f"covers/{cover_filename}",
        "review": review
    }

    reviews.append(entry)
    save_reviews(reviews)

    return jsonify({"ok": True, "id": new_id, "cover": entry["cover"]})


if __name__ == "__main__":
    app.run(debug=True)
