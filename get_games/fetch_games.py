"""Generate kino.wtf game catalog entries from IMDb CSV + TMDb.

Outputs:
- JSON file for tooling/debug (`--output`)
- Optional append to Supabase catalog tables (`--write-db`)

Schema resilience:
- `validate_game_schema` centralizes runtime checks.
- `normalize_game_for_catalog` is the adaptation point if catalog schema changes later.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import logging
import os
import random
import time
from datetime import date
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote

import pandas as pd
import requests
from dotenv import load_dotenv


TMDB_BASE = 'https://api.themoviedb.org/3'
IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
SKIP_GENRE_IDS = {99, 10770}  # Documentary, TV Movie


class CustomFormatter(logging.Formatter):
    grey = '\x1b[38;20m'
    yellow = '\x1b[33;20m'
    red = '\x1b[31;20m'
    bold_red = '\x1b[31;1m'
    reset = '\x1b[0m'
    pattern = '[%(asctime)s %(name)s %(levelname)s %(filename)s:%(lineno)d] %(message)s'

    FORMATS = {
        logging.DEBUG: grey + pattern + reset,
        logging.INFO: grey + pattern + reset,
        logging.WARNING: yellow + pattern + reset,
        logging.ERROR: red + pattern + reset,
        logging.CRITICAL: bold_red + pattern + reset,
    }

    def format(self, record):
        formatter = logging.Formatter(self.FORMATS.get(record.levelno, self.pattern))
        return formatter.format(record)


logger = logging.getLogger('get_games')
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    handler.setFormatter(CustomFormatter())
    logger.addHandler(handler)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Generate game catalog entries from IMDb + TMDb.')
    parser.add_argument('--file', type=str, required=True, help='CSV IMDb list filename')
    parser.add_argument('--output', type=str, required=True, help='output JSON filename')
    parser.add_argument('--type', type=str, required=True, choices=['title', 'person'])
    parser.add_argument('--limit', type=int, default=20, help='max rows to process from CSV')
    parser.add_argument(
        '--director',
        action='store_true',
        help='when --type person: use directing credits instead of acting credits',
    )
    parser.add_argument(
        '--mode',
        type=str,
        choices=['actors', 'movies', 'directors'],
        help='catalog mode for DB append',
    )
    parser.add_argument('--write-db', action='store_true', help='append generated rows to Supabase')
    parser.add_argument('--supabase-url', type=str, help='override Supabase URL')
    parser.add_argument('--supabase-service-key', type=str, help='override service role key')
    parser.add_argument(
        '--catalog-schema-version',
        type=str,
        default='v1',
        help='catalog schema adapter version (default: v1)',
    )

    args = parser.parse_args()
    if args.limit <= 0:
        raise ValueError('--limit must be greater than 0')
    if args.write_db and not args.mode:
        raise ValueError('--mode is required when using --write-db')

    return args


def contains_none_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, dict):
        return any(contains_none_value(v) for v in value.values())
    if isinstance(value, list):
        return any(contains_none_value(v) for v in value)
    return False


def tmdb_get(
    session: requests.Session,
    path: str,
    tmdb_token: str,
    params: dict[str, Any] | None = None,
    retries: int = 3,
    timeout_seconds: int = 30,
) -> dict[str, Any]:
    url = f'{TMDB_BASE}/{path.lstrip("/")}'
    headers = {
        'accept': 'application/json',
        'Authorization': f'Bearer {tmdb_token}',
    }

    for attempt in range(1, retries + 1):
        try:
            response = session.get(url, headers=headers, params=params, timeout=timeout_seconds)
            if response.status_code >= 500:
                raise RuntimeError(f'TMDb server error {response.status_code}: {response.text}')
            if response.status_code >= 400:
                raise RuntimeError(f'TMDb request failed {response.status_code}: {response.text}')
            return response.json()
        except Exception as exc:
            if attempt >= retries:
                raise RuntimeError(f'Failed TMDb request after {retries} attempts for {url}') from exc
            sleep_seconds = 0.4 * attempt
            logger.warning('Retrying TMDb request (%s/%s) in %.1fs: %s', attempt, retries, sleep_seconds, url)
            time.sleep(sleep_seconds)

    raise RuntimeError(f'Failed TMDb request for {url}')


def build_movie_game(details: dict[str, Any]) -> dict[str, Any] | None:
    cast = details.get('credits', {}).get('cast', [])
    directors = [crew.get('name') for crew in details.get('credits', {}).get('crew', []) if crew.get('job') == 'Director']

    hints: list[dict[str, Any]] = []
    for actor in cast[:6]:
        profile_path = actor.get('profile_path')
        name = actor.get('name')
        if not profile_path or not name:
            continue
        hints.append(
            {
                'title': name,
                'link': f"https://themoviedb.org/person/{actor.get('id')}",
                'image': f'{IMAGE_BASE}{profile_path}',
            }
        )

    hints.reverse()
    game_obj = {
        'answer': {
            'id': int(details.get('id', 0)),
            'title': details.get('original_title'),
            'image': f"{IMAGE_BASE}{details.get('poster_path')}" if details.get('poster_path') else None,
            'URL': f"https://themoviedb.org/movie/{details.get('id')}",
        },
        'hints': hints,
        'trivia': [
            {
                'label': 'Genres',
                'value': ', '.join([genre.get('name', '') for genre in details.get('genres', []) if genre.get('name')]),
            },
            {
                'label': 'Director',
                'value': ', '.join([name for name in directors if name]) if directors else None,
            },
            {
                'label': 'Release Year',
                'value': (details.get('release_date') or '')[:4] if details.get('release_date') else None,
            },
        ],
    }

    if not validate_game_schema(game_obj):
        return None
    return game_obj


def build_person_game(details: dict[str, Any], use_director_credits: bool) -> dict[str, Any] | None:
    gender_map = {1: 'Female', 2: 'Male', 3: 'Non-binary'}
    gender = gender_map.get(details.get('gender'), 'Not specified')

    if use_director_credits:
        raw_credits = [
            credit
            for credit in details.get('movie_credits', {}).get('crew', [])
            if credit.get('job') == 'Director'
        ]
    else:
        raw_credits = details.get('movie_credits', {}).get('cast', [])

    hints: list[dict[str, Any]] = []
    for credit in sorted(raw_credits, key=lambda c: c.get('popularity') or 0, reverse=True):
        if len(hints) == 6:
            break

        poster_path = credit.get('poster_path')
        release_date = credit.get('release_date')
        title = credit.get('title')
        if not poster_path or not release_date or not title:
            continue

        if release_date > date.today().isoformat():
            logger.warning("Skipping %s credit %s because release date is in the future", details.get('name'), title)
            continue

        genre_ids = credit.get('genre_ids', [])
        if any(int(genre_id) in SKIP_GENRE_IDS for genre_id in genre_ids):
            logger.warning('Skipping %s credit %s due to genre ids %s', details.get('name'), title, genre_ids)
            continue

        hints.append(
            {
                'title': title,
                'image': f'{IMAGE_BASE}{poster_path}',
                'link': f"https://themoviedb.org/movie/{credit.get('id')}",
                'year': int(release_date[:4]),
            }
        )

    hints.reverse()
    game_obj = {
        'answer': {
            'id': int(details.get('id', 0)),
            'title': details.get('name'),
            'image': f"{IMAGE_BASE}{details.get('profile_path')}" if details.get('profile_path') else None,
            'URL': f"https://themoviedb.org/person/{details.get('id')}",
        },
        'hints': hints,
        'trivia': [
            {'label': 'Place of Birth', 'value': details.get('place_of_birth')},
            {'label': 'Birthdate', 'value': details.get('birthday')},
            {'label': 'Gender', 'value': gender},
        ],
    }

    if not validate_game_schema(game_obj):
        return None
    return game_obj


def validate_game_schema(game_obj: dict[str, Any]) -> bool:
    if contains_none_value(game_obj):
        return False
    if len(game_obj.get('hints', [])) != 6:
        return False
    if len(game_obj.get('trivia', [])) != 3:
        return False
    if not isinstance(game_obj.get('answer', {}).get('title'), str):
        return False
    return True


def normalize_game_for_catalog(game_obj: dict[str, Any], schema_version: str) -> dict[str, Any]:
    """Schema evolution hook for catalog payloads.

    If/when game schema changes, add adapters here instead of spreading conversion logic.
    """
    if schema_version == 'v1':
        return game_obj
    raise ValueError(f'Unsupported catalog schema version: {schema_version}')


def get_movie_info(imdb_id: str, session: requests.Session, tmdb_token: str) -> list[dict[str, Any]]:
    logger.info('Getting movie details for %s', imdb_id)
    find_data = tmdb_get(
        session,
        f'find/{imdb_id}',
        tmdb_token,
        params={'external_source': 'imdb_id', 'language': 'en-US'},
    )

    games: list[dict[str, Any]] = []
    for result in find_data.get('movie_results', []):
        movie_id = result.get('id')
        if movie_id is None:
            continue
        details = tmdb_get(
            session,
            f'movie/{movie_id}',
            tmdb_token,
            params={'append_to_response': 'credits', 'language': 'en-US'},
        )
        game_obj = build_movie_game(details)
        if not game_obj:
            logger.warning('Skipping movie id=%s due to schema/quality checks', movie_id)
            continue
        games.append(game_obj)
    return games


def get_person_info(
    imdb_id: str,
    session: requests.Session,
    tmdb_token: str,
    use_director_credits: bool,
) -> list[dict[str, Any]]:
    logger.info('Getting person details for %s', imdb_id)
    find_data = tmdb_get(
        session,
        f'find/{imdb_id}',
        tmdb_token,
        params={'external_source': 'imdb_id', 'language': 'en-US'},
    )

    games: list[dict[str, Any]] = []
    for result in find_data.get('person_results', []):
        person_id = result.get('id')
        if person_id is None:
            continue
        details = tmdb_get(
            session,
            f'person/{person_id}',
            tmdb_token,
            params={'append_to_response': 'movie_credits', 'language': 'en-US'},
        )
        game_obj = build_person_game(details, use_director_credits)
        if not game_obj:
            logger.warning('Skipping person id=%s due to schema/quality checks', person_id)
            continue
        games.append(game_obj)
    return games


def read_imdb_ids(csv_path: str, limit: int) -> list[str]:
    df = pd.read_csv(csv_path)
    if 'Const' not in df.columns:
        raise ValueError("CSV is missing required 'Const' column")
    ids = [str(value).strip() for value in df['Const'].tolist() if str(value).strip()]
    return ids[:limit]


def get_games(args: argparse.Namespace, tmdb_token: str) -> list[dict[str, Any]]:
    logger.info('Starting scrape from %s with limit=%s', args.file, args.limit)
    ids = read_imdb_ids(args.file, args.limit)
    if not ids:
        return []

    session = requests.Session()
    mode_fetcher: Callable[[str], list[dict[str, Any]]]
    if args.type == 'person':
        mode_fetcher = lambda imdb_id: get_person_info(imdb_id, session, tmdb_token, args.director)
    else:
        mode_fetcher = lambda imdb_id: get_movie_info(imdb_id, session, tmdb_token)

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        results = executor.map(mode_fetcher, ids)

    games = [entry for result in results for entry in result]
    return games


def get_catalog_table(mode: str) -> str:
    mapping = {
        'actors': 'actor_games',
        'movies': 'movie_games',
        'directors': 'director_games',
    }
    if mode not in mapping:
        raise ValueError(f'Unsupported mode: {mode}')
    return mapping[mode]


def get_supabase_credentials(args: argparse.Namespace) -> tuple[str, str]:
    supabase_url = args.supabase_url or os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    service_key = args.supabase_service_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not service_key:
        raise RuntimeError(
            'Supabase credentials missing. Provide --supabase-url and --supabase-service-key '
            'or set SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        )
    return supabase_url.rstrip('/'), service_key


def fetch_next_game_index(session: requests.Session, supabase_url: str, service_key: str, table_name: str) -> int:
    request_url = (
        f'{supabase_url}/rest/v1/{table_name}'
        '?select=game_index'
        '&order=game_index.desc'
        '&limit=1'
    )
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
    }

    response = session.get(request_url, headers=headers, timeout=30)
    if response.status_code >= 400:
        raise RuntimeError(f'Failed reading current game index ({response.status_code}): {response.text}')

    payload = response.json()
    if not payload:
        return 0
    return int(payload[0].get('game_index', -1)) + 1


def append_games_to_supabase(games: list[dict[str, Any]], args: argparse.Namespace) -> int:
    if not games:
        logger.warning('No games generated; skipping Supabase append')
        return 0
    if not args.mode:
        raise RuntimeError('Missing --mode for Supabase writes')

    supabase_url, service_key = get_supabase_credentials(args)
    table_name = get_catalog_table(args.mode)
    session = requests.Session()
    start_index = fetch_next_game_index(session, supabase_url, service_key, table_name)

    payload_rows = []
    for offset, game in enumerate(games):
        payload_rows.append(
            {
                'game_index': start_index + offset,
                'game_data': normalize_game_for_catalog(game, args.catalog_schema_version),
            }
        )

    request_url = f'{supabase_url}/rest/v1/{quote(table_name)}'
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }

    response = session.post(request_url, headers=headers, json=payload_rows, timeout=90)
    if response.status_code >= 400:
        raise RuntimeError(
            f'Failed appending generated games to {table_name} ({response.status_code}): {response.text}'
        )

    logger.info('Appended %s games to %s starting at game_index=%s', len(payload_rows), table_name, start_index)
    return len(payload_rows)


def write_json_output(games: list[dict[str, Any]], output_name: str) -> str:
    output_filename = output_name if output_name.endswith('.json') else f'{output_name}.json'
    output_path = Path(output_filename)
    output_path.write_text(json.dumps(games, indent=2, sort_keys=True, ensure_ascii=True), encoding='utf-8')
    return output_filename


def main() -> None:
    load_dotenv()
    args = parse_args()

    tmdb_token = os.getenv('TMDB_API_TOKEN')
    if not tmdb_token:
        raise RuntimeError('TMDB_API_TOKEN is required')

    games = get_games(args, tmdb_token)
    random.shuffle(games)

    if args.write_db:
        appended = append_games_to_supabase(games, args)
        logger.info('Successfully wrote %s new game entries to Supabase', appended)

    output_filename = write_json_output(games, args.output)
    logger.info('Successfully fetched %s %s game objects and exported to %s', len(games), args.type, output_filename)


if __name__ == '__main__':
    main()
