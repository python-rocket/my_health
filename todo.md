# TODO Youtube Summarizer



# IN PROGRESS


# TODO

## USEFUL FOR ME
tests uploader
- upload test in any format (pdf, csv..)
- saves into structured form and in english to database

solutions
- show all solutions with status filters (e.g open)
- top solutions dasboard 
--> algo based on: manual ranking; solution mentioned in data sources; my experience with it based on protocol.



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
- new table structure
--> track (field)
--> track (score)
--> track_sleep(score), track_stomach_pain(field)
--> hypothesize_correlation_low_sleep_ill
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