V0.8 (beta)

An app that runs several games and questionnaires locally on your computer.

More info to come...


# Installation and running
Everything is wrapped in a docker image.

Clone this repo first

1. Download docker desktop
2. Run the following in terminal from within main folder (the one with "Dockerfile"):
  - docker compose build --no-cache && docker compose up -d --force-recreate (I know, it is excessive, but if you want to do some changes or need to relaunch it for whatever reason, this ensures no issues)
  - docker compose down (for when you need to clean up a bit --- but remember to close and remove within docker desktop)
3. Point your favorite web browser at "http://localhost:3000/" (tested on Chrome)
4. Check results folder for results
