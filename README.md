V0.8 (beta)

An app that runs several games and questionnaires locally on your computer.

Currently, seven games are built and ready to rock:
1) Dot memory: several dots are shown briefly on screen, then your task is to remember where they were. The location is the same thus tracking learning rate over trials.
2) Path tracing: trace a path with a circle under "drift" in various directions. Shape of path and pattern of drift remains fixed over trials, thus learnable
3) Tracking: track a moving ball with a circle. The pattern of movement remains fixed over trials, thus learnable.
4) Fingertapping: tap a sequence of numbers as fast as possible and as accurately as possible. Numbers remain fixed over trials, thus learnable.
5) Prediction: choose box 1 or box 2 depending on what four "advisors" tell you, some of them are more reliable than others, which is learnable.
6) Pattern matching: match a symbol to four reference symbols according to a hidden rule. When the rule is learned, it changes. Speed of finding the rule = learning/executive function.

In additon, several template questionnaires are added to the app. Change these in the .csv files found inside app/questionnaires. Follow the template questionnaires and you'll see how it works.

# Installation and running
Everything is wrapped in a docker image.

Clone this repo first

1. Download docker desktop
2. Run the following in terminal from within main folder (the one with "Dockerfile"):

--- docker compose build --no-cache && docker compose up -d --force-recreate

I know, it is excessive, but if you want to do some changes or need to relaunch it for whatever reason, this ensures no issues.

3. Point your favorite web browser at "http://localhost:3000/" (tested on Chrome)
4. Check results folder for all results, and questionnaire folder for the specific questionnaires' results

# Starting and stopping
If you want to close the session, go to Docker desktop and press stopp in "containers". 
If you want to start the session again, press play in "containers".
Then go to "http://localhost:3000/" 

# Removing the app
If you want to delete the app, press delete first in "containers" page in Docker desktop, then in "images" tab.
Then, in terminal: 

--- docker compose down 
      
This is simply to clean up a bit --- but remember to close and remove within docker desktop).
Finally, delete the app, but remember to save your results!
