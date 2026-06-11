#!/usr/bin/env python3
"""Fetch Letterboxd data into assets/data/letterboxd.json.

Pulls:
  - recent reviews from the public RSS feed (letterboxd.com/<user>/rss/)
  - the four favorite films from the public profile page
  - every film rating (for the histogram) from the /films/ pages
  - the watchlist (first page of posters + total count)

Posters are resolved via each film page's LD+JSON metadata.

Run by .github/workflows/letterboxd.yml on a schedule, or by hand:
  python3 scripts/fetch_letterboxd.py

Stdlib only — no dependencies.
"""
import html as htmlmod
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from xml.etree import ElementTree

USERNAME = os.environ.get("LETTERBOXD_USER", "Girff")
MAX_REVIEWS = 40          # keep the whole feed; pages filter what they need
MAX_RATING_PAGES = 20     # 72 films/page — plenty of headroom
WATCHLIST_POSTERS = 18    # how many watchlist films get posters on the site
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "data", "letterboxd.json")

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 personal-site-fetcher")

NS = {"letterboxd": "https://letterboxd.com", "tmdb": "https://themoviedb.org"}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).strip()


def split_name(name):
    """'Nope (2022)' -> ('Nope', '2022')"""
    m = re.match(r"^(.*?)(?:\s+\((\d{4})\))?$", name)
    return (m.group(1), m.group(2) or "") if m else (name, "")


def grid_items(page_html):
    """Yield (name, slug) for every LazyPoster grid item on a page."""
    for block in re.finditer(r'<div class="react-component"[^>]*data-component-class="LazyPoster"[^>]*>', page_html):
        attrs = dict(re.findall(r'data-([a-z-]+)="([^"]*)"', block.group(0)))
        name = htmlmod.unescape(attrs.get("item-name", ""))
        slug = attrs.get("item-slug", "")
        if name and slug:
            yield name, slug


def last_page(page_html, kind):
    pages = re.findall(rf"{kind}/page/(\d+)/", page_html)
    return max([int(p) for p in pages], default=1)


def fetch_reviews(user):
    xml = get(f"https://letterboxd.com/{user}/rss/")
    root = ElementTree.fromstring(xml)
    reviews = []
    for item in root.iter("item"):
        guid = item.findtext("guid") or ""
        if "letterboxd-review" not in guid:
            continue  # skip plain watches, lists, etc.

        desc = item.findtext("description") or ""
        poster = re.search(r'<img src="([^"]+)"', desc)

        body = re.sub(r"<p><img[^>]*/?></p>", "", desc)
        paras = [strip_tags(p) for p in re.findall(r"<p>(.*?)</p>", body, re.S)]
        text = " ".join(p for p in paras if p)
        if len(text) > 600:
            text = text[:600].rsplit(" ", 1)[0] + "…"

        rating = item.findtext("letterboxd:memberRating", namespaces=NS)
        reviews.append({
            "title": item.findtext("letterboxd:filmTitle", default="", namespaces=NS),
            "year": item.findtext("letterboxd:filmYear", default="", namespaces=NS),
            "rating": float(rating) if rating else None,
            "watched": item.findtext("letterboxd:watchedDate", default="", namespaces=NS),
            "rewatch": (item.findtext("letterboxd:rewatch", default="No", namespaces=NS) == "Yes"),
            "url": item.findtext("link", default=""),
            "poster": poster.group(1) if poster else None,
            "review": text,
        })
        if len(reviews) >= MAX_REVIEWS:
            break
    return reviews


def film_poster(slug):
    """The film page embeds its poster in LD+JSON."""
    try:
        page = get(f"https://letterboxd.com/film/{slug}/")
        m = re.search(
            r'<script type="application/ld\+json">\s*(?:/\*.*?\*/)?\s*(\{.*?\})\s*(?:/\*.*?\*/)?\s*</script>',
            page, re.S)
        if m:
            return json.loads(m.group(1)).get("image")
    except Exception as e:
        print(f"  poster lookup failed for {slug}: {e}", file=sys.stderr)
    return None


def fetch_favorites(user):
    page = get(f"https://letterboxd.com/{user}/")
    sec = re.search(r'<section id="favourites".*?</section>', page, re.S)
    if not sec:
        return []
    favorites = []
    for name, slug in grid_items(sec.group(0)):
        title, year = split_name(name)
        favorites.append({
            "title": title,
            "year": year,
            "url": f"https://letterboxd.com/film/{slug}/",
            "poster": film_poster(slug),
        })
    return favorites[:4]


def fetch_ratings(user):
    """Every rated film: the /films/ grid pairs each poster with a
    'rated-N' span (N = stars * 2) inside the same <li>."""
    ratings = []
    page_count = None
    page_num = 1
    while page_num <= (page_count or 1):
        url = f"https://letterboxd.com/{user}/films/"
        if page_num > 1:
            url += f"page/{page_num}/"
        page = get(url)
        if page_count is None:
            page_count = min(last_page(page, "films"), MAX_RATING_PAGES)

        for li in re.finditer(r'<li class="griditem">(.*?)</li>', page, re.S):
            block = li.group(1)
            items = list(grid_items(block))
            rated = re.search(r"rated-(\d+)", block)
            if not items or not rated:
                continue  # watched but unrated
            title, year = split_name(items[0][0])
            ratings.append({
                "title": title,
                "year": year,
                "url": f"https://letterboxd.com/film/{items[0][1]}/",
                "rating": int(rated.group(1)) / 2.0,
            })
        page_num += 1
    return ratings


def fetch_watchlist(user):
    page = get(f"https://letterboxd.com/{user}/watchlist/")
    count = re.search(r"js-watchlist-count[^>]*>([\d,]+)", page)
    total = int(count.group(1).replace(",", "")) if count else None

    films = []
    for name, slug in grid_items(page):
        title, year = split_name(name)
        films.append({
            "title": title,
            "year": year,
            "url": f"https://letterboxd.com/film/{slug}/",
            "poster": film_poster(slug) if len(films) < WATCHLIST_POSTERS else None,
        })
    if total is None:
        total = len(films)
    return {"total": total, "films": films}


def main():
    print(f"fetching letterboxd data for {USERNAME}…")
    data = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "username": USERNAME,
        "profile": f"https://letterboxd.com/{USERNAME}/",
        "favorites": fetch_favorites(USERNAME),
        "reviews": fetch_reviews(USERNAME),
        "ratings": fetch_ratings(USERNAME),
        "watchlist": fetch_watchlist(USERNAME),
    }
    print(f"  {len(data['favorites'])} favorites, {len(data['reviews'])} reviews, "
          f"{len(data['ratings'])} ratings, watchlist {data['watchlist']['total']}")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"wrote {os.path.normpath(OUT_PATH)}")


if __name__ == "__main__":
    main()
