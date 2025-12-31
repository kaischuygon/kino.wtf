"""
    This script takes an IMDb list of people or tiles, attempts to build a Game object by fetching details from TMDb and exports the data to a JSON file.

    Creates:
        (--args.output).json - a JSON file containing the list of Game objects as defined in /src/hooks/useGame.tsx


    Install dependencies:
        pip install -r requirements.txt

    Ensure you have TMDB_API_TOKEN set in your environment variables

    Usage:
        # fetch actors
        python ./fetch_games.py --file ./kino-actors.csv --type person --output actors.json --limit 1000
        # fetch movies
        python ./fetch_games.py --file ./kino-movies.csv --type title --output movies.json --limit 1000
        # fetch directors
        python ./fetch_games.py --file ./kino-directors.csv --type person --director true --output directors.json --limit 1000
    
    Arguments: 
        --file (string): A CSV file of IMDb people or titles
        --output (string): Name of output JSON file
        
    Optional arguments:
        --director (bool): Fetch director credits instead of acting credits 
        --limit - an integer for the limit of people to scrape

"""

from dotenv import load_dotenv
import numpy as np
import requests
import os
import json
import logging
import concurrent.futures
import argparse
import pandas as pd
import html
from datetime import date

def escape_html(json_data):
    if isinstance(json_data, dict):
        return {k: escape_html(v) for k, v in json_data.items()}
    elif isinstance(json_data, list):
        return [escape_html(element) for element in json_data]
    elif isinstance(json_data, str):
        return html.escape(json_data)
    else:
        return json_data

# Create a parser
parser = argparse.ArgumentParser(description='Process some integers.')
# Add the 'limit' argument
parser.add_argument('--limit', type=int, help='an integer for the limit')
parser.add_argument('--file', type=str, help='csv IMDb list of people filename')
parser.add_argument('--output', type=str, help='filename of output JSON object')
parser.add_argument('--type', type=str, help='type of IMDb IDs (title, person)')
parser.add_argument('--director', type=bool, default=False, help='get persons directing credits instead of acting credits')

# Parse the arguments
args = parser.parse_args()

# Check for required arguments
if not args.file:
    raise TypeError("Argument --file missing. Must be a IMDb list CSV")

if not args.output:
    raise TypeError("Argument --output missing")

if args.type not in ["title", "person"] :
    raise TypeError("Argument --type missing or must be \'title\' or \'person\'")

game_type = args.type

class CustomFormatter(logging.Formatter):
    grey = "\x1b[38;20m"
    yellow = "\x1b[33;20m"
    red = "\x1b[31;20m"
    bold_red = "\x1b[31;1m"
    reset = "\x1b[0m"
    format = "[%(asctime)s %(name)s %(levelname)s %(filename)s:%(lineno)d] %(message)s"

    FORMATS = {
        logging.DEBUG: grey + format + reset,
        logging.INFO: grey + format + reset,
        logging.WARNING: yellow + format + reset,
        logging.ERROR: red + format + reset,
        logging.CRITICAL: bold_red + format + reset
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)

# create logger with ''
logger = logging.getLogger("people")
logger.setLevel(logging.DEBUG)

# create console handler with a higher log level
ch = logging.StreamHandler()
ch.setLevel(logging.DEBUG)

ch.setFormatter(CustomFormatter())

logger.addHandler(ch)

def contains_none_value(nested_dict):
    """
    Recursively check if any value in a nested dictionary is None.

    Args:
        nested_dict (dict): The dictionary to check.

    Returns:
        bool: True if a None value is found, False otherwise.
    """
    # Iterate over all values in the dictionary
    for value in nested_dict.values():
        if value is None:
            # Found a None value, return True immediately
            return True
        elif isinstance(value, dict):
            # If the value is a dictionary, recurse into it
            if contains_none_value(value):
                return True
        elif isinstance(value, list):
            # Also handle nested lists that might contain dictionaries or None
            for item in value:
                if item is None:
                    return True
                elif isinstance(item, dict):
                    if contains_none_value(item):
                        return True
    
    # No None values found in this level or any nested levels
    return False

def get_movie_info(imdb_id:str):
    """
        Gets the movie details from TMDb given IMDb ID

        Args:
            imdb_id (string): movie's IMDb ID

        Returns:
            dict: the movie details as Game object
    """
    movies = []
    logger.info(f"Getting details for {imdb_id}")
    url = f"https://api.themoviedb.org/3/find/{imdb_id}?external_source=imdb_id&language=en-US"

    headers = {
        "accept": "application/json",
        "Authorization": "Bearer {}".format(TMDB_API_TOKEN),
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        logger.error("Error getting info for {} (status code {}) header {}".format(imdb_id, response.status_code, response.headers))
    
    data = json.loads(response.text)
    results = data['movie_results']
    for result in results:
        movie_id = result['id']
        details_url = f"https://api.themoviedb.org/3/movie/{movie_id}?append_to_response=credits&language=en-US"
        response = requests.get(details_url, headers=headers)
        
        details = json.loads(response.text)
        
        # get director(s) names
        directors = [crew['name'] for crew in details['credits']['crew'] if crew['job'] == 'Director']
        
        # get top 6 billed actors
        hints = []
        for actor in details['credits']['cast'][:6]:
            if actor.get('profile_path') and actor.get('name'):
                hints.append({
                    'title': actor['name'],
                    'link': f"https://themoviedb.org/person/{actor['id']}",
                    'image': f"https://image.tmdb.org/t/p/w500{actor['profile_path']}" if actor.get('profile_path') else None,
                })
        
        # reverse hints so the game gets easier the more hints are revealed
        hints.reverse()
        
        # Build Game object
        game_obj ={
            'answer': {
                'id': int(details['id']),
                'title': details['original_title'],
                'image': f"https://image.tmdb.org/t/p/w500{details['poster_path']}" if details['poster_path'] else None,
                'URL': f'https://themoviedb.org/movie/{details['id']}',
            },
            'hints': hints,
            'trivia': [
                {
                    'label': 'Genres',
                    'value': ", ".join([genre['name'] for genre in details['genres']])
                },
                {
                    'label': 'Director',
                    'value': ", ".join(directors) if directors else None
                },
                {
                    'label': 'Release Year',
                    'value': details['release_date'][:4]
                },
            ]
        }

        movie_name = game_obj['answer']['title']

        # If any of the keys are missing, dont add the movie
        if contains_none_value(game_obj):
            logger.warning("Missing values for movie {}, skipping".format(movie_name))
            continue
        # If credits list is not 6 long, dont add the movie
        if len(game_obj['hints']) != 6:
            logger.warning("Movie {} does not have 6 cast, skipping".format(movie_name))
            continue
        # If trivia list is not 3 long, don't add the movie
        if len(game_obj['trivia']) != 3:
            logger.warning("Movie {} does not have enough trivia, skipping".format(movie_name))
            continue
        
        movies.append(game_obj)

    return movies

def get_person_info(imdb_id:str):
    """
        Gets the movie details from TMDb given IMDb ID

        Args:
            imdb_id (string): person's IMDb ID

        Returns:
            dict: the person's details as Game object
    """
    people = []
    logger.info(f"Getting details for {imdb_id}")
    url = f"https://api.themoviedb.org/3/find/{imdb_id}?external_source=imdb_id&language=en-US"

    headers = {
        "accept": "application/json",
        "Authorization": "Bearer {}".format(TMDB_API_TOKEN),
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        logger.error("Error getting info for {} (status code {}) header {}".format(imdb_id, response.status_code, response.headers))
    
    data = json.loads(response.text)
    results = data['person_results']
    for result in results:
        person_id = result['id']
        details_url = f"https://api.themoviedb.org/3/person/{person_id}?append_to_response=movie_credits&language=en-US"
        response = requests.get(details_url, headers=headers)
        
        details = json.loads(response.text)
        
        # Get gender
        if details['gender'] == 1:
            gender = 'Female'
        elif details['gender'] == 2:
            gender = 'Male'
        elif details['gender'] == 3:
            gender = 'Non-binary'
        else:
            gender = 'Not specified'
        
        # sort credit by popularity (most popular first)
        hints = []
        credit_count = 0
        credits = [credit for credit in details['movie_credits']['crew'] if credit['job'] == 'Director'] if args.director else details['movie_credits']['cast']
        for credit in sorted(credits, key=lambda credit: credit['popularity'] if credit.get('popularity') else 0, reverse=True):
            if credit_count == 6:
                break
            if credit.get('poster_path') and credit.get('release_date') and credit.get('title'):
                # Ignore documentary or TV-Film credits
                if credit['release_date'] > date.today().isoformat():
                    logger.warning('Skipping %s\'s credit %s since release date is in the future', details['name'], credit['title'])
                    continue
                if any(int(genre) in [99, 10770] for genre in credit['genre_ids']):
                    logger.warning('Skipping %s\'s credit %s due to genre(s) %s', details['name'], credit['title'], credit['genre_ids'])
                else: 
                    hints.append({
                        'title': credit['title'],
                        'image': f"https://image.tmdb.org/t/p/w500{credit['poster_path']}" if credit.get('poster_path') else None,
                        'link': f"https://themoviedb.org/movie/{credit['id']}",
                        'year': int(credit['release_date'][:4]),
                    })
                    credit_count += 1
        
        # reverse hints so the game gets easier the more hints are revealed
        hints.reverse()
        
        # Build Game object
        game_obj ={
            'answer': {
                'id': int(details['id']),
                'title': details['name'],
                'image': f"https://image.tmdb.org/t/p/w500{details['profile_path']}" if details['profile_path'] else None,
                'URL': f'https://themoviedb.org/person/{details['id']}',
            },
            'hints': hints,
            'trivia': [
                {
                    'label': 'Place of Birth',
                    'value': details['place_of_birth']
                },
                {
                    'label': 'Birthdate',
                    'value': details['birthday']
                },
                {
                    'label': 'Gender',
                    'value': gender
                },
            ]
        }

        person_name = game_obj['answer']['title']

        # If any of the keys are missing, dont add the person
        if contains_none_value(game_obj):
            logger.warning("Missing values for person {}, skipping".format(person_name))
            continue
        # If credits list is not 6 long, dont add the person
        if len(game_obj['hints']) != 6:
            logger.warning("Person {} does not have 6 credits, skipping".format(person_name))
            continue
        # If trivia list is not 3 long, don't add the person
        if len(game_obj['trivia']) != 3:
            logger.warning("Person {} does not have enough trivia, skipping".format(person_name))
            continue
        
        people.append(game_obj)

    return people

def get_games():
    logger.info("Starting to scrape ids")
    if(args.limit):
        logger.info(f"Limiting to {args.limit} ids".format(args.limit))
    
    if not args.file:
        raise TypeError("Missing argument --file")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        # Load the people from imdb list export
        ids = []
        df = pd.read_csv(args.file)
        for _, row in df.iterrows():
            ids.append(row['Const'])
        
        limit = int(args.limit) if args.limit else 20 # defaults to 20
        results = executor.map(get_person_info if args.type == "person" else get_movie_info, ids[:limit])
    
    # flatten the list of lists
    games = [data for game in results for data in game]
    return games

# main function
if __name__ == "__main__":
    load_dotenv()
    global TMDB_API_TOKEN
    TMDB_API_TOKEN = os.getenv("TMDB_API_TOKEN")

    # Get list of Game objects 
    data = get_games()

    logger.info("Randomizing the order of data")
    np.random.shuffle(data)
    data_json = json.dumps(data, indent=4, sort_keys=True)

    output_filename = args.output if '.json' in args.output else f"{args.output}.json"

    logger.info("Exporting {} and escaping html characters in the json object".format(output_filename))
    # export the json object to a file
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        outfile.write(data_json)

    logger.info("Sucessfully fetched {} {} Game objects and exported to {}".format(len(data), args.type, output_filename))
