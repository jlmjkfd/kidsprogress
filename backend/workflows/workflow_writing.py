from collections import defaultdict
import json
import re
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph.message import add_messages
from db.client import MongoDBClient
from db.models import ChatHistory, EnglishWriting
from db.constants import CollectionName
from llm.provider import LLMProvider
from langgraph.graph import StateGraph, END
from workflows.states import WritingWorkflowState


llm = LLMProvider.get_llm()
mongodb = MongoDBClient.get_db()
mongoclient = MongoDBClient.get_client()
print(mongodb.list_collection_names())


# Create nodes
"""
Workflow: 
    [START]
        ↓ 
    [Extract Metadata]  (Genre and Subjects identification, using LLM)
        ↓
    [Fetch Criterion]  (Read the rateable dimensions from MongoDB)
        ↓
    [Evaluate and improve Writing] (By LLM)
        ↓
    [Save to DB] 
        ↓
    [Prepare Response]
        ↓
    [END]
"""


def extract_metadata(state: WritingWorkflowState):
    print(">>>>>>>>extract metadata")
    prompt = f"Please identify the genre and subject, return a json string (not quote in code block) like {{\"genre\":\"genre of the writing\", \"subjects\":[\"subject1\",\"subject2\"]}} \nTitle: {state.get('title')}\n Text: {state.get('text')}"
    # msg = llm.invoke(prompt)
    msg = AIMessage(
        content='{"genre":"Personal narrative", "subjects":["School life", "Mandarin class", "Playtime"]}'
    )
    print(">>>>>>>>extract_metadata msg.content")
    print(msg.content)
    genre, subjects = parse_genre_subject(str(msg.content))
    # genre, subjects = parse_genre_subject('{"genre":"Personal Narrative", "subjects":["Snowman building", "Childhood experiences", "Perseverance"]}')
    print(genre, "54")
    print(subjects, subjects[0])
    return {"genre": genre, "subjects": subjects}


def fetch_criteria(state: WritingWorkflowState):
    criteria = get_writing_criterion()
    print(">>>>>>>>fetch criteria")
    print(criteria)
    return {"criteria": str(criteria)}


def evaluate_writing(state: WritingWorkflowState):
    print(">>>>>>>>evaluate writing")
    prompt = [
        {
            "role": "system",
            "content": "You are a kind, frendly and professional teacher of a 6-year-old boy. Your task is to improve the student's skills.",
        },
        {
            "role": "user",
            "content": (
                f"Evaluate the following writing based on these criteria (No need to use all, use applicable ones):{state.get('criteria')}.\n"
                f"Title: {state.get('title')}"
                f"Text: {state.get('text')}"
                f"Return a rubric scoring(1-10), an overall score(1-10), feedback_student(strengths and weaknesses, suggestion, reason of the score, etc. Use teacher's positive tone), feedback_parent(feedback for parents to know the capability of the student) and a improved version."
                f"The return message structure should be {{'overall_score':8,'rubric_scores':[{{'dimension':'dimension1','criteria':[{{'criterion':'criterion1','score':8,'reason':'some reason'}},]}},],'feedback_student':'','feedback_parent':'','improved_text':''}}"
                f"(literally, do not quote in code block and no other words before and after, be careful of the quotation marks in the return text, don't break the json format)"
            ),
        },
    ]
    # msg = llm.invoke(prompt)
    msg = AIMessage(
        content='{"overall_score":8,"rubric_scores":[{"dimension":"Content and Ideas","criteria":[{"criterion":"Clarity of main idea","score":9,"reason":"Your main idea about your day at school is super clear! I know exactly what you\'re writing about."},{"criterion":"Relevance","score":9,"reason":"Everything you wrote fits perfectly with your day at school. Great job staying on topic!"},{"criterion":"Originality","score":8,"reason":"You picked some really cool and specific things that happened to YOU, like making a snake and playing chase. That makes your story special!"},{"criterion":"Completeness","score":8,"reason":"You told us about a few fun things you did, which is a great start for your story!"}]},{"dimension":"Structure and Organization","criteria":[{"criterion":"Introduction","score":8,"reason":"You started right away by telling us what you did today, which is a great way to begin your story!"},{"criterion":"Sequencing","score":9,"reason":"You put your day in the right order, from your lesson to playtime. Easy to follow!"},{"criterion":"Conclusion","score":8,"reason":"Your ending, \'School is best!\', is a happy and clear way to finish your story."}]},{"dimension":"Language Use","criteria":[{"criterion":"Vocabulary","score":8,"reason":"You used good words that tell us what you did, like \'mandar lesson\' and \'chase.\'"},{"criterion":"Sentence structure","score":8,"reason":"You used different kinds of sentences, like telling us \'why\' you like running around. That\'s super clever!"},{"criterion":"Transitions","score":7,"reason":"You used words like \'Today\' and \'At lunch playtime\' to help us know when things happened. You could try adding a few more next time!"}]},{"dimension":"Grammar and Mechanics","criteria":[{"criterion":"Spelling","score":7,"reason":"You spelled most of your words so well! \'Favourite\' is perfect. Keep practicing a few tricky ones, like \'Mandarin\' and remember \'snake\' needs an \'a\' in front of it when you talk about one snake."},{"criterion":"Punctuation","score":9,"reason":"Wow! You used capital letters at the start of your sentences and full stops at the end. And that exclamation mark at the end makes your writing sound so excited!"},{"criterion":"Grammar","score":7,"reason":"You did a super job, but sometimes we just need to add tiny words like \'a\' or \'the\' to make sentences sound just right, like \'a Mandarin lesson\' or \'the year of the snake.\' We can practice this together!"}]},{"dimension":"Voice and Tone","criteria":[{"criterion":"Appropriateness","score":9,"reason":"Your writing sounds just like you! It\'s happy and excited, which is perfect for talking about your school day."},{"criterion":"Engagement","score":9,"reason":"I really wanted to keep reading because you sound so happy about school! You made your story fun to read."}]},{"dimension":"Effort and Improvement","criteria":[{"criterion":"Length","score":8,"reason":"This is a great length for your story! You gave us enough details without making it too long."}]}],"feedback_student":"Hello there, my little author! I just read your wonderful story, \'My day at school,\' and it made me smile so much! You did an absolutely fantastic job, and I\'m so proud of your hard work. \\n\\n**Here are some things you did so well:**\\n*   Your story is super clear, and I could easily imagine what your day was like. \\n*   You put your ideas in a great order, from your lesson to playtime, which makes it easy to follow.\\n*   I love how you used an exclamation mark at the end to show how excited you are about school! Your happy voice really shines through.\\n*   You used words like \'because\' to tell us why you like running, which is a very clever way to write!\\n\\n**Here are some fun things we can learn together to make your writing even more super:**\\n*   Sometimes, we need to add little helper words like \'a\' or \'the\' to our sentences. For example, instead of \'I had mandar lesson,\' we could say \'I had **a** Mandarin lesson.\' And \'I made snake\' could be \'I made **a** snake.\' We can practice this by reading your story aloud to see if any small words are missing.\\n*   We can also check our spelling for words like \'Mandarin.\' It\'s a tricky one!\\n\\nYour story is already amazing for a 6-year-old, and you showed great effort! Keep up the fantastic writing, and let\'s keep practicing those little helper words. You are doing brilliantly!","improved_text":"Today I had a Mandarin lesson. I made a snake because this year is the year of the snake. At lunch playtime, I played my favourite game, chase. It\'s my favourite game because I like running around. School is the best!","feedback_parent":"xxxxx"}',
        additional_kwargs={},
        response_metadata={
            "prompt_feedback": {"block_reason": 0, "safety_ratings": []},
            "finish_reason": "STOP",
            "model_name": "gemini-2.5-flash",
            "safety_ratings": [],
        },
        id="run--9ba1904e-83d8-4fe4-ae57-2d3d008b87cd-0",
        usage_metadata={
            "input_tokens": 478,
            "output_tokens": 3085,
            "total_tokens": 3563,
            "input_token_details": {"cache_read": 0},
            "output_token_details": {"reasoning": 2014},
        },
    )
    print(msg)
    print(">>>>>>>>>>>>>>>>>>>>>>>>content>>>>>>>>")
    print(str(msg.content))
    overall_score, rubric_scores, feedback_student, feedback_parent, improved_text = (
        parse_evaluation(str(msg.content))
    )
    return {
        "rubric_scores": rubric_scores,
        "overall_score": overall_score,
        "feedback_student": feedback_student,
        "feedback_parent": feedback_parent,
        "improved_text": improved_text,
    }


def save_to_db(state: WritingWorkflowState):
    print(">>>>>>>>save writing to db")
    writingId = save_writing_to_db(state)
    return {"writingId": writingId}


def prepare_response(state: WritingWorkflowState):
    print(">>>>>>>>prepare response")
    # return {
    #     "messages": [
    #         AIMessage(
    #             content=str(
    #                 {
    #                     "id": state.get("writing_id"),
    #                     "overall_score": state.get("overall_score"),
    #                     "rubric_scores": state.get("rubric_scores"),
    #                     "comment": state.get("comment"),
    #                     "improved_text": state.get("improved_text"),
    #                 }
    #             )
    #         )
    #     ]
    # }
    return state


# class WritingWorkflow:
#     def __init__(self, llm, tools):
#         self.llm = llm
#         self.tools = tools


def build_writing_workflow():
    print(">>>>>>>>>>build writing workflow")
    builder = StateGraph(WritingWorkflowState)
    builder.add_node("extract_metadata", extract_metadata)
    builder.add_node("fetch_criteria", fetch_criteria)
    builder.add_node("evaluate", evaluate_writing)
    builder.add_node("save", save_to_db)
    builder.add_node("respond", prepare_response)

    builder.set_entry_point("extract_metadata")
    builder.add_edge("extract_metadata", "fetch_criteria")
    builder.add_edge("fetch_criteria", "evaluate")
    builder.add_edge("evaluate", "save")
    builder.add_edge("save", "respond")
    builder.add_edge("respond", END)

    return builder.compile()


# functions
def get_writing_criterion():
    """
    Get all criterions for evaluating writing.
    """
    # db = MongoDBClient.get_db()
    documents = mongodb[CollectionName.WRITING_CRITERIA.value].find()

    dimension_map = defaultdict(list)
    for doc in documents:
        dimension = doc["dimension"]
        criteria = {"criteria": doc["criteria"]}
        dimension_map[dimension].append(criteria)
    result = {
        "dimensions": [
            {"dimension": dim, "criteria": criteria_list}
            for dim, criteria_list in dimension_map.items()
        ]
    }
    return result


def save_writing_to_db(state: WritingWorkflowState):
    data = EnglishWriting(
        # id=uuid.uuid4(),
        title=state.get("title", ""),
        text=state.get("text", ""),
        genre=state.get("genre"),
        subjects=state.get("subjects"),
        feedback_student=state.get("feedback_student"),
        feedback_parent=state.get("feedback_parent"),
        overall_score=state.get("overall_score"),
        rubric_scores=state.get("rubric_scores"),
        improved_text=state.get("improved_text"),
    )
    print(">>>>>>> data writing to db:")
    print(data)

    # session = mongoclient.start_session()
    # try:
    #     with session.start_transaction():
    #         result1 = mongodb[CollectionName.ENG_WRITINGS.value].insert_one(data.model_dump())
    #         writing_id = result1.inserted_id

    #         info = {"writing_id": writing_id}
    #         chatData = ChatHistory(
    #             id = state.get("id"),
    #             role=state.get("")
    #         )
    # except:

    # finally:

    result = mongodb[CollectionName.ENG_WRITINGS.value].insert_one(data.model_dump())
    return str(result.inserted_id)


def remove_json_and_ticks(s):
    # RegExp start from ```json and end with```
    pattern = r"```json(.*?)```"
    match = re.match(pattern, s, re.DOTALL)

    if match:
        content = match.group(1)
        return content
    else:
        return s


def parse_genre_subject(text: str):
    text = remove_json_and_ticks(text)
    jsonObj = json.loads(text)
    genre = jsonObj["genre"]
    subjects = jsonObj["subjects"]
    return genre, subjects


def parse_evaluation(text: str):
    text = remove_json_and_ticks(text)
    jsonObj = json.loads(text)
    overall_score = jsonObj["overall_score"]
    rubric_scorers = jsonObj["rubric_scores"]
    feedback_student = jsonObj["feedback_student"]
    feedback_parent = jsonObj["feedback_parent"]
    improved_text = jsonObj["improved_text"]
    return (
        overall_score,
        rubric_scorers,
        feedback_student,
        feedback_parent,
        improved_text,
    )
