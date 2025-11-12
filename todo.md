# TODO Youtube Summarizer



# IN PROGRESS


# TODO

tests uploader
- We need to aslo write the date of the test into the database. Usually the test document has a date.
It should be be the value in the database. For that in the database we need one extra column "testing_date".
It should also be shown in the frontend.
- some tests are just "positive" or "negative" (e.g test for mutation.) without having an explicit value.
Add to the agent instructions that for such tests for positive the value 1 and for negative the value -1.
And same for reference. 
- Add to the table the option to sort by test_object column or by the new testing_date column


## USEFUL FOR ME
daily protocol
- define psql table format for protocol
- dynamic:
--> track (field)
--> track (score)
--> track_sleep(score), track_stomach_pain(field)
--> hypothesize_correlation_low_sleep_ill
- have it adjustable (llm can add new column)
- we mark columns as "active" or "hide"
- daily: llm knows which fields need to be filled in. We have conversation it fills the data. Asks me if something still there to be filled.
- daily: I can say lets start to track the following: water_amount. It asks me to specify if its a bool or a ranking, or a free text field.
- daily: warnings: It checks the protocol and based on warning-settings will e.g say if i did not train for more then 3 days.
- hypothesise: wen feeling especially good or bad find out why based on logs. 
--> update hypothesizes regularely: e.g ranking of 0-5 if bad sleep 3 times in a row = more likely to get ill


solutions
- show all solutions with status filters (e.g open)
- top solutions to try dashboard 
--> algo based on: manual ranking; solution mentioned in data sources; my experience with it based on protocol.

metrics/insights:
- e.g compare number of success 7 wake up compared to last time. Or compared to record per month.
- e.g give avg ranking of sleep over the last 7 days

glossar
- illnesses (hashimotos, crohns..)
- supplements
- treatments (ozone, IV..)
- protocols (detox, lowfoodmap, lowcarb, )



agents:
- tech debt agent (checks for tech debt and refactoring ideas)- add instructions. e.g thinking about scalibility, costs, modular..

frontend:
- decide for design (find examples to copy)
- decide for structure (e.g different tabs on the right side and some main at the top.)
- frontend code instructions: e.g have eyh code for one page seperate (maybe already the case)=

data sources:
- books/audiobooks
- reddit
- twitter/instagram..

research mentions in video:
- fix: rerun andrehuberman with correct youtube channel id parsing
- todo: find youtube health channels focused on studies (also adding them to description..)
- rerun "study finder" based on those channels

frontend ideas:
- recommendations: Based on personal settings recommend to read new pubmed studies
- create youtube channel graph visual (edge=number of mentions)

ai doctor:

- "ai doctor" add a hypothesise and start to track it.
- "ai doctor" here are the 10 hypothesize which are "active". Means questions should be asked to validate them. Each day note if hypothesize got stronger or weaker.
- enable audio communication (e.g with openai realtime wisper)
- add "warnings": e.g 2 times in a row low sleep score. Clear warning i need to focus on that. Even send reminders?
- have daily conversation -> save protocol -> fill out automatically other fields
--> ai doctor knows which fields need to be filled (e.g stuhl). It asks me to mention how my stuhl was. Then saves info there.
--> i can per voice adjust table schemas (e.g: start to track if i have fungue in the morning)

tech debt:
- tech debt: when new expert or new metadata discovered -> update channel table also.
- tech debt: ensure anti duplication (before processing?)



# Backlog
- feature: question cacher:
--> 1. Try to check existing labels
--> 2. Try to check existing answers
--> 3. Send subtitles to LLM
- feature: for topic or question return me top 5 videos and timestamp.
- feature: channel and video metadata (subscribers, number of videos, video published at, video views, video comments)
- channel connector
--> based on existing channels finds new channels which are connected
--> creates weight on strength of relationship (based on collaborations, topic overlap)
- channel products
--> based on website identifies which products the channel offers and to which conditions