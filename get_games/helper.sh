eval $(op signin) && 
op run --env-file op.env -- python ./fetch_games.py --file ./kino-actors.csv --type person --output actors.json --limit 1000 &&
op run --env-file op.env -- python ./fetch_games.py --file ./kino-movies.csv --type title --output movies.json --limit 1000 &&
op run --env-file op.env -- python ./fetch_games.py --file ./kino-directors.csv --type person --director true --output directors.json --limit 1000
