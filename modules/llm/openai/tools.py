from openai import OpenAI
import json
import os
from dotenv import load_dotenv
import pandas as pd
from collections import defaultdict
from pydantic import BaseModel
from pathlib import Path

# Load env
load_dotenv()

# Your Postgres client
from modules.youtube_summarizer.src.utils.psql_client import PSQLClient

# Init clients
psql_client = PSQLClient(os.getenv("PSQL_CONNECTION_STRING"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def load_schema_file(schema_path: str) -> str:
    """Load database schema from file."""
    try:
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                return f.read()
        else:
            print(f"Warning: Schema file not found at {schema_path}")
            return ""
    except Exception as e:
        print(f"Warning: Failed to load schema file: {e}")
        return ""



# Tools schema (for the model)
tools = [
    {
        "type": "function",
        "name": "get_video_title",
        "description": "Get the title of a video.",
        "parameters": {
            "type": "object",
            "properties": {"video_id": {"type": "string", "description": "A video id"}},
            "required": ["video_id"],
        },
    },
    {
        "type": "function",
        "name": "get_video_subtitle",
        "description": "Get the subtitle of a video.",
        "parameters": {
            "type": "object",
            "properties": {"video_id": {"type": "string", "description": "A video id"}},
            "required": ["video_id"],
        },
    },
    {
        "type": "function",
        "name": "get_topics_for_video",
        "description": "Get the topics for a video.",
        "parameters": {
            "type": "object",
            "properties": {"video_id": {"type": "string", "description": "A video id"}},
            "required": ["video_id"],
        },
    },
    {
        "type": "function",
        "name": "get_videos_for_channel",
        "description": "Get the videos for a channel.",
        "parameters": {
            "type": "object",
            "properties": {
                "channel_id": {"type": "string", "description": "A channel id"}
            },
            "required": ["channel_id"],
        },
    },
    {
        "type": "function",
        "name": "execute_sql_query",
        "description": "Execute a SQL query.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "A SQL query"}},
            "required": ["query"],
        },
    },
]


tools = [
    {
        "type": "function",
        "name": "execute_sql_query",
        "description": "Execute a SQL query on a PostgreSQL database.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "A SQL query on a PostgreSQL database",
                }
            },
            "required": ["query"],
        },
    }
]


class LLMToolsResult(BaseModel):
    tools: list
    result: str


# --- Actual tool implementations ---
def get_video_title(video_id: str) -> str:
    query = f"SELECT id, title, url, channel_id FROM videos WHERE id = '{video_id}'"
    df = psql_client.read_sql_query(query)
    if df is None or len(df) == 0:
        return f"{video_id}: No video found."
    return f"{video_id}: The video title is {df.iloc[0]['title']}."


def get_video_subtitle(video_id: str) -> str:
    query = f"SELECT subtitles FROM video_subtitles WHERE video_id = '{video_id}'"
    df = psql_client.read_sql_query(query)
    if df is None or len(df) == 0 or pd.isna(df.iloc[0].get("subtitles", None)):
        return f"{video_id}: No subtitles found."
    subtitle = str(df.iloc[0]["subtitles"])[:1000]  # trim long results
    return f"{video_id}: The video subtitle is {subtitle}"


def get_videos_for_channel(channel_id: str) -> str:
    query = f"SELECT id, title, url, channel_id FROM videos WHERE channel_id = '{channel_id}'"
    df = psql_client.read_sql_query(query)
    if df is None or len(df) == 0:
        return f"{channel_id}: No videos found."
    # Return compact JSON-like string for the model to consume
    return (
        f"{channel_id}: The videos are {df[['id','title']].to_dict(orient='records')}"
    )


def get_topics_for_video(video_id: str) -> str:
    query = (
        "SELECT channel_id, video_id, topic_name, value "
        f"FROM v_video_topic WHERE video_id = '{video_id}' AND value IS NOT NULL"
    )
    df = psql_client.read_sql_query(query)
    if df is None or len(df) == 0:
        return f"{video_id}: No topics found."
    return f"{video_id}: The topics are {df.to_dict(orient='records')}"


def execute_sql_query(query: str) -> str:
    NOT_ALLOWED_OPERATIONS = ["DELETE", "UPDATE", "INSERT", "CREATE", "ALTER"]
    if any(query.upper().startswith(q) for q in NOT_ALLOWED_OPERATIONS):
        return f"Those queries are not allowed: {NOT_ALLOWED_OPERATIONS}"
    print("Executing query: ", query)
    df = psql_client.read_sql_query(query)
    return f"{query}: The result is {df.to_dict(orient='records')}"


def truncate_input_list_by_chars(input_list, max_chars=600000):
    """Ensure the combined text of all messages doesn't exceed max_chars."""
    # Flatten and count characters
    total_length = sum(len(str(msg.get("content", ""))) for msg in input_list if isinstance(msg, dict))
    print(f"🧮 Current input size: {total_length} chars")

    # If over the limit, remove oldest user/assistant/tool messages (keep system)
    while total_length > max_chars and len(input_list) > 2:
        for i, msg in enumerate(input_list):
            if msg.get("role") != "system":
                removed_len = len(str(msg.get("content", "")))
                del input_list[i]
                total_length -= removed_len
                print(f"⚠️ Truncated {removed_len} chars, new size: {total_length}")
                break

    return input_list



def generate_completion_with_tools(prompt: str, max_iterations: int = 10) -> LLMToolsResult:
    """
    Generate completion with tools support.
    
    Args:
        prompt: The user prompt/question
        max_iterations: Maximum number of tool iterations (default: 15)
    """
    if not max_iterations:
        print("No max_iterations provided, using default of 10")
        max_iterations = 10
        
    print("\n********** Generating completion with tools, with max_iterations: ", max_iterations, "**********")
    # --- Conversation starts here ---
    response_early_exit = None
    iterations_max = max_iterations
    sql_text_limit = 50000
    
    # Build system message
    system_content_parts = [
        "ONLY use the available tools to answer.",
        "If you don't understand my question, use the tools to check the data. Then you might understand the context better.",
        f"WHEN you have to query the column subtitles from the table video_subtitles, make sure to only read below 5 rows.",
        f"Also for each row limit the length of the text of the column to about {sql_text_limit} characters.",
        "Start with reading the available views starting with v_*. They provide the best information.",
        f"You will only have this amount of tool iterations: {iterations_max}. So make sure to use your tool requests wisely.",
    ]
    
    input_list = [
        {
            "role": "system",
            "content": "\n".join(system_content_parts),
        },
        {
            "role": "user",
            "content": prompt,
        },
    ]

    # Track tool usage
    tool_usage_order = []  # exact sequence of tool names used
    tool_usage_counts = defaultdict(int)  # per-tool counter

    # 1) First call
    input_list = truncate_input_list_by_chars(input_list)
    response = client.responses.create(
        model="gpt-5",
        tools=tools,
        input=input_list,
    )

    # print("Initial response:")
    # print(response.model_dump_json(indent=2))
    # print("\n" + (response.output_text or ""))

    # Append the model's content blocks (so function_call call_ids are present next turn)
    input_list += response.output

    # 2) Tool-calling loop
    iterations = 0
    
    while iterations < iterations_max:
        iterations += 1
        print(f"Iteration: {iterations}")

        # Collect tool outputs for THIS response
        tool_outputs_this_turn = []
        function_call_made = False

        for block in response.output:
            if getattr(block, "type", None) == "function_call":
                function_call_made = True
                fn_name = block.name
                args = json.loads(block.arguments or "{}")

                print(f"**Function call made: {fn_name}")

                # Track usage
                tool_usage_order.append(fn_name)
                tool_usage_counts[fn_name] += 1

                if fn_name == "get_video_title":
                    result = get_video_title(args["video_id"])
                    tool_outputs_this_turn.append(
                        {
                            "type": "function_call_output",
                            "call_id": block.call_id,
                            "output": json.dumps({"title": result}),
                        }
                    )

                elif fn_name == "get_video_subtitle":
                    result = get_video_subtitle(args["video_id"])
                    tool_outputs_this_turn.append(
                        {
                            "type": "function_call_output",
                            "call_id": block.call_id,
                            "output": json.dumps({"subtitle": result}),
                        }
                    )

                elif fn_name == "get_topics_for_video":
                    result = get_topics_for_video(args["video_id"])
                    tool_outputs_this_turn.append(
                        {
                            "type": "function_call_output",
                            "call_id": block.call_id,
                            "output": json.dumps({"topics": result}),
                        }
                    )

                elif fn_name == "get_videos_for_channel":
                    result = get_videos_for_channel(args["channel_id"])
                    tool_outputs_this_turn.append(
                        {
                            "type": "function_call_output",
                            "call_id": block.call_id,
                            "output": json.dumps({"videos": result}),
                        }
                    )

                elif fn_name == "execute_sql_query":
                    result = execute_sql_query(args["query"])
                    tool_outputs_this_turn.append(
                        {
                            "type": "function_call_output",
                            "call_id": block.call_id,
                            "output": json.dumps({"result": result}),
                        }
                    )

        if function_call_made:
            # Provide ALL tool outputs for this turn
            input_list += tool_outputs_this_turn
            
            # Warning when only 2 iterations left
            if iterations == iterations_max - 2:
                input_list.append({
                    "role": "system",
                    "content": "WARNING: You only have 2 more tool iterations remaining. Make sure to use them efficiently."
                })
            
            if iterations == iterations_max - 1:
                input_list.append({
                    "role": "system",
                    "content": "This is your last chance to use a tool. Make the most complete and final query you can. After this, no more tool calls will be allowed and you must give me the final answer."
                })

            # Ask model again with the new information
            input_list = truncate_input_list_by_chars(input_list)
            response = client.responses.create(
                model="gpt-5",
                tools=tools,
                input=input_list,
            )

            # print("Assistant response:")
            # print(response.model_dump_json(indent=2))
            # print("\n" + (response.output_text or ""))

            # Append new content blocks (may include more function calls)
            input_list += response.output
        else:
            # No more tool calls → final answer is in output_text
            break
        
        if iterations == iterations_max:
            print("Tool iterations max reached. Creating final request.")

            # Convert input_list into chat messages (only keep system/user/assistant with text content)
            chat_messages = []
            for msg in input_list:
                # Some blocks from `response.output` may be tool calls, skip those
                if isinstance(msg, dict) and msg.get("type") == "function_call_output":
                        # convert tool output into assistant-readable context
                        chat_messages.append({
                            "role": "assistant",
                            "content": f"Tool output: {msg['output']}"
                        })

            # Add final system instruction
            chat_messages.append({
                "role": "system",
                "content": """Give me now the best final answer you have 
                only based on the information that i provided to you. If you where not able to find a reasonable answer, just say that you dont have the data to give a valid answer."""
            })

            # Now make a plain chat completion call
            completion = client.chat.completions.create(
                model="gpt-5",
                messages=chat_messages
            )

            response_early_exit = completion.choices[0].message.content
            break
    
    print("Final output:")
    # response = response.model_dump_json(indent=2)
    if response_early_exit:
        response = response_early_exit
    else:
        response = response.output_text

    print("\n" + (response or ""))

    # --- Summary of tool usage ---
    print("\n=== Tool Usage Summary ===")
    print("Order of tools called:")
    print(" -> ".join(tool_usage_order) if tool_usage_order else "(none)")

    print("\nCounts per tool:")
    if tool_usage_counts:
        for name, count in tool_usage_counts.items():
            print(f"- {name}: {count}")
    else:
        print("(none)")
    llm_tools_result = LLMToolsResult(
        tools=tool_usage_order, result=response
    )
    return llm_tools_result


if __name__ == "__main__":
    prompt = "For the channel id: ByronHerbalist give me all video titles about the topic: detox"
    llm_tools_result = generate_completion_with_tools(prompt)
    print(llm_tools_result)
