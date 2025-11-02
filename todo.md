# TODO Youtube Summarizer

## DONE - use cases
- which channels do i have?
- give me all videos for the topic "detox".
- tell me which videos of which channels mention the supplement glutathione
- Give me the most popular health topics and tell me why
- Which experts should i check for the topic detox and why
- Which channel is the best for the topic detox and why
- Which solutions related to gut health the most popular and why?
- Give me the most mentioned experts based on channel ultimatehuman.
- Give me instructions how to us Glutathione based on youtube experts and pubmed.

## DONE - backend features
- feature: download videos per channel
- feature: download subtitles per video
- feature: ask llm question about video
- feature: psql databse with table schemas
- feature: llm label creator
- feature: llm tools (llm can access database directly)
- feature: add solution category tables
- feature: llm "solution" labeler
- feature: expert extractor
- feature: expert metadata (youtube, instagram, website)
- feature: top channel relations + parse them
- feature: create summary. Prefer using summary. If not available use subtitles.
- feature: extract research
- feature: get pubmed of researc
- feature: processed table tracks what has already beed processed
- feature: pubmed: download by search term and filters (e.g glutathione clynical trials)

## DONE - frontend features
- feature: add UI
- feature: add cockpit
- feature: add preferences
- feature: add ask tab
- feature: show youtube recommendations

# IN PROGRESS


# TODO - tech debt:


# TODO


# IDEAS:
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