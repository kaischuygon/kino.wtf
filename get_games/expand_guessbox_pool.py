"""Expand the offline guessbox suggestion pool using TMDb popular endpoints.

Writes rows into public.guessbox_options via Supabase REST API.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import time
from typing import Any

import requests
from dotenv import load_dotenv


TMDB_BASE = 'https://api.themoviedb.org/3'


def decode_jwt_without_verification(token: str) -> dict[str, Any] | None:
    parts = token.split('.')
    if len(parts) != 3:
        return None

    payload_segment = parts[1]
    padded = payload_segment + '=' * (-len(payload_segment) % 4)
    try:
        payload = base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8')
        decoded = json.loads(payload)
        if isinstance(decoded, dict):
            return decoded
    except Exception:
        return None
    return None


def looks_like_service_role_key(key: str) -> bool:
    # New Supabase secret keys are non-JWT strings beginning with sb_secret_.
    if key.startswith('sb_secret_'):
        return True

    claims = decode_jwt_without_verification(key)
    if not claims:
        return False

    role = claims.get('role')
    if isinstance(role, str) and role == 'service_role':
        return True

    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Expand guessbox options from TMDb popular lists.')
    parser.add_argument('--people-pages', type=int, default=100, help='TMDb /person/popular pages to fetch')
    parser.add_argument('--movie-pages', type=int, default=100, help='TMDb /movie/popular pages to fetch')
    parser.add_argument('--language', type=str, default='en-US', help='TMDb language parameter')
    parser.add_argument('--batch-size', type=int, default=500, help='Supabase upsert batch size')
    parser.add_argument('--supabase-url', type=str, help='override Supabase URL')
    parser.add_argument('--supabase-service-key', type=str, help='override service role key')
    parser.add_argument('--dry-run', action='store_true', help='print counts only, no DB writes')
    args = parser.parse_args()

    if args.people_pages < 0 or args.movie_pages < 0:
        raise ValueError('--people-pages and --movie-pages must be >= 0')
    if args.batch_size <= 0:
        raise ValueError('--batch-size must be > 0')

    return args


def tmdb_get(
    session: requests.Session,
    path: str,
    tmdb_token: str,
    params: dict[str, Any],
    retries: int = 3,
) -> dict[str, Any]:
    url = f"{TMDB_BASE}/{path.lstrip('/')}"
    headers = {
        'accept': 'application/json',
        'Authorization': f'Bearer {tmdb_token}',
    }

    for attempt in range(1, retries + 1):
        try:
            response = session.get(url, headers=headers, params=params, timeout=30)
            if response.status_code >= 500:
                raise RuntimeError(f'TMDb server error {response.status_code}: {response.text}')
            if response.status_code >= 400:
                raise RuntimeError(f'TMDb request failed {response.status_code}: {response.text}')
            return response.json()
        except Exception:
            if attempt >= retries:
                raise
            time.sleep(0.4 * attempt)

    raise RuntimeError(f'Failed TMDb request for {url}')


def fetch_popular_names(
    session: requests.Session,
    tmdb_token: str,
    path: str,
    pages: int,
    language: str,
    field: str,
) -> set[str]:
    names: set[str] = set()
    for page in range(1, pages + 1):
        payload = tmdb_get(
            session,
            path,
            tmdb_token,
            params={'language': language, 'page': page},
        )
        for entry in payload.get('results', []):
            value = entry.get(field)
            if isinstance(value, str) and value.strip():
                names.add(value.strip())
    return names


def upsert_guessbox_options(
    session: requests.Session,
    supabase_url: str,
    service_key: str,
    entity_kind: str,
    titles: list[str],
    batch_size: int,
) -> int:
    if not titles:
        return 0

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/guessbox_options?on_conflict=entity_kind,title"
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }

    written = 0
    for start in range(0, len(titles), batch_size):
        chunk = titles[start : start + batch_size]
        payload = [{'entity_kind': entity_kind, 'title': title} for title in chunk]
        response = session.post(endpoint, headers=headers, json=payload, timeout=60)
        if response.status_code >= 400:
            raise RuntimeError(
                f'Failed upserting {entity_kind} options ({response.status_code}): {response.text}'
            )
        written += len(chunk)

    return written


def main() -> None:
    load_dotenv()
    args = parse_args()

    tmdb_token = os.getenv('TMDB_API_TOKEN')
    if not tmdb_token:
        raise RuntimeError('TMDB_API_TOKEN is required')

    supabase_url = args.supabase_url or os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    service_key = args.supabase_service_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if not args.dry_run and (not supabase_url or not service_key):
        raise RuntimeError(
            'Supabase credentials missing. Set SUPABASE_URL/VITE_SUPABASE_URL and '
            'SUPABASE_SERVICE_ROLE_KEY or pass --supabase-url/--supabase-service-key.'
        )
    if not args.dry_run and not looks_like_service_role_key(service_key):
        raise RuntimeError(
            'SUPABASE_SERVICE_ROLE_KEY does not look like a service role key. '
            'Use the service role/secret key, not the anon publishable key.'
        )

    session = requests.Session()

    people_names = fetch_popular_names(
        session,
        tmdb_token,
        'person/popular',
        pages=args.people_pages,
        language=args.language,
        field='name',
    )
    movie_titles = fetch_popular_names(
        session,
        tmdb_token,
        'movie/popular',
        pages=args.movie_pages,
        language=args.language,
        field='title',
    )

    print(f'Fetched people names: {len(people_names)}')
    print(f'Fetched movie titles: {len(movie_titles)}')

    if args.dry_run:
        return

    written_people = upsert_guessbox_options(
        session,
        supabase_url,
        service_key,
        'person',
        sorted(people_names),
        args.batch_size,
    )
    written_movies = upsert_guessbox_options(
        session,
        supabase_url,
        service_key,
        'movie',
        sorted(movie_titles),
        args.batch_size,
    )

    print(f'Upserted person options: {written_people}')
    print(f'Upserted movie options: {written_movies}')


if __name__ == '__main__':
    main()