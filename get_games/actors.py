"""
    Source for the top 1000 actors: https://www.imdb.com/list/ls524618334/
    
    This script scrapes top most popular actors and their top 6 credits in the US region from TMDb and exports the data to a JSON file for the web app to use.

    Creates:
        actors.json - a JSON file containing the list of Game objects as defined in TODO


    Install dependencies:
        pip install -r requirements.txt

    Ensure you have TMDB_API_TOKEN set in your environment variables

    Usage:
        python actors.py
        
    Optional arguments:
        --limit - an integer for the limit of actors to scrape
            python actors.py --limit 10

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

# Parse the arguments
args = parser.parse_args()

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
logger = logging.getLogger("actors")
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

def get_actor_info(actor_id:str):
    """
        Gets the actors details from TMDb from IMDb ID

        Args:
            actor_id (string): actor's IMDb ID

        Returns:
            dict: the actor's details
    """
    actors = []
    logger.info(f"Getting actor details for {actor_id}")
    url = f"https://api.themoviedb.org/3/find/{actor_id}?external_source=imdb_id&language=en-US"

    headers = {
        "accept": "application/json",
        "Authorization": "Bearer {}".format(TMDB_API_TOKEN),
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        logger.error("Error getting info for {} (status code {}) header {}".format(actor_id, response.status_code, response.headers))
    
    data = json.loads(response.text)
    results = data['person_results']
    for result in results:
        actor_id = result['id']
        details_url = f"https://api.themoviedb.org/3/person/{actor_id}?append_to_response=movie_credits&language=en-US"
        response = requests.get(details_url, headers=headers)
        details = json.loads(response.text)
        if details['gender'] == 1:
            gender = 'Female'
        elif details['gender'] == 2:
            gender = 'Male'
        elif details['gender'] == 3:
            gender = 'Non-binary'
        else:
            gender = 'Not specified'
        hints = []
        credit_count = 0
        # sort credit by popularity (most popular first)
        for credit in sorted(details['movie_credits']['cast'], key=lambda credit: credit['popularity'] if credit.get('popularity') else 0, reverse=True):
            if credit_count == 6:
                break
            if credit.get('poster_path') and credit.get('release_date') and credit.get('title'):
                # Ignore documentary or TV-Film credits
                if any(int(genre) in [99, 10770] for genre in credit['genre_ids']):
                    logger.warning('Skipping %s\'s credit %s due to genre(s) %s', details['name'], credit['title'], credit['genre_ids'])
                else: 
                    hints.append({
                        'title': credit['title'],
                        'image': f"https://image.tmdb.org/t/p/w500{credit['poster_path']}",
                        'year': int(credit['release_date'][:4]),
                    })
                    credit_count += 1
        hints.reverse()
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

        actor_name = game_obj['answer']['title']

        # If any of the keys are missing, dont add the actor
        if contains_none_value(game_obj):
            logger.warning("Missing values for actor {}, skipping".format(actor_name))
            continue
        # If credits list is not 6 long, dont add the actor
        if len(game_obj['hints']) != 6:
            logger.warning("Actor {} does not have 6 credits, skipping".format(actor_name))
            continue
        # If trivia list is not 3 long, don't add the actor
        if len(game_obj['trivia']) != 3:
            logger.warning("Actor {} does not have enough trivia, skipping".format(actor_name))
            continue
        
        actors.append(game_obj)

    return actors

def get_top_rated_actors(limit:int = 20):
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        # Load the actors from imdb list export
        actor_ids = []
        df = pd.read_csv('kino-actors.csv')
        for _, row in df.iterrows():
            actor_ids.append(row['Const'])
            
        results = executor.map(get_actor_info, actor_ids[:limit])
    
    # flatten the list of lists
    actors = [actor for imdb_id in results for actor in imdb_id]
    return actors

# main function
if __name__ == "__main__":
    load_dotenv()
    global TMDB_API_TOKEN
    TMDB_API_TOKEN = os.getenv("TMDB_API_TOKEN")
    logger.info("Starting to scrape ids")
    if args.limit:
        logger.info(f"Limiting to {args.limit} ids")
        actors = get_top_rated_actors(int(args.limit))
    else:
        logger.info("No limit specified, defaulting to 20 ids.")
        actors = get_top_rated_actors()

    # randomize the order of the actors
    logger.info("Randomizing the order of the actors")
    np.random.shuffle(actors)
    actors_json = json.dumps(actors, indent=4, sort_keys=True)

    logger.info("Exporting actors.json and escaping html characters in the json object")
    # export the json object to a file
    with open('actors.json', 'w', encoding='utf-8') as outfile:
        outfile.write(actors_json)

    logger.info("Sucessfully scraped {} actors".format(len(actors)))
