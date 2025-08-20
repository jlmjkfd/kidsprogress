
import configparser
import os
from pathlib import Path
from typing import Annotated, TypedDict, NotRequired
from operator import add
from langchain_core.messages import AnyMessage
from langchain.chat_models import init_chat_model
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.runnables.config import RunnableConfig

from .utils import FormHandler

class WorkFlowState(TypedDict):
    #messages: Annotated[list[AnyMessage], add]
    messages: Annotated[list[AnyMessage], add_messages]
    is_form: bool
    topic_type: NotRequired[str]
    user_input: NotRequired[str]
    response: NotRequired[str]

class Agent:
    def __init__(self):
        self.llm=None
        self._load_model()
        self.builder = StateGraph(WorkFlowState)
        self.checkpointer = MemorySaver()
        self.graph = self._create_graph()
    
    def _get_api_key(self):
        config = configparser.ConfigParser()
        config_file = Path("config.ini")
        
        # Try to read the existing configuration file
        if config_file.exists():
            config.read(config_file)
            if 'DEFAULT' in config and 'GOOGLE_API_KEY' in config['DEFAULT']:
                return config['DEFAULT']['GOOGLE_API_KEY']
        
        api_key = input("Enter API key for Google Gemini: ")
        
        # Write to the configuration file
        if not config.has_section('DEFAULT'):
            config['DEFAULT'] = {}
        config['DEFAULT']['GOOGLE_API_KEY'] = api_key
        with open(config_file, 'w') as f:
            config.write(f)
        
        return api_key
        
    def _load_model(self):
        if not os.environ.get("GOOGLE_API_KEY"):
            os.environ["GOOGLE_API_KEY"] = self._get_api_key()
        model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
        self.llm = model
        
    def query(self, messages):
        if self.llm is None:
            raise RuntimeError("LLM not loaded.")
        result = self.llm.invoke(messages)
        return result.content
        
    #def _supervisor(self):
    def _create_graph(self):
        def is_form_submission_node(state: WorkFlowState):
            print(state)
            print("enter is_form node")
            return state
        
        def form_dispatch_node(state: WorkFlowState):
            # result = FormHandler.handle(state)
            # state["response"] = result
            print("enter form_dispatch node")
            return state
        
        def form_writing_node(state: WorkFlowState):
            age = 6
            prompt = f"""You are a professional writing teacher, your student is {age} years old.
                        Your task is helping improve the student's writing skills by following aspects including(not exact all and not limited to)
                        1. transcription(spelling). 2.composition(grammar, sentence structures and punctuation). 3.Word/Phrase selection 
                        4.coherence and logic 5. Relevance to the title
                        """
            print("enter form_writing node")
            return state
        
        def other_node(state: WorkFlowState):
            print("enter other node")
            return state
        
        self.builder.add_node("is_form", is_form_submission_node)
        self.builder.add_node("form_dispatch", form_dispatch_node)
        self.builder.add_node("form_writing", form_writing_node)
        self.builder.add_node("other",other_node)
        
        def route_is_form(state:WorkFlowState):
            return "form_dispatch" if state["is_form"] else "other"
        
        def route_form_dispatch(state: WorkFlowState):
            return "form_writing"
        
        self.builder.add_edge(START, "is_form")
        self.builder.add_conditional_edges("is_form", route_is_form, ["form_dispatch", "other"])
        self.builder.add_conditional_edges("form_dispatch", route_form_dispatch, ["form_writing","other"])
        self.builder.add_edge("other",END)
        self.builder.add_edge("form_writing",END)
        
        return self.builder.compile(checkpointer=self.checkpointer)
    
    def ask_model(self, thread_id, input):
        config: RunnableConfig = {
            "configurable": {
                "thread_id": thread_id
            }
        }
        response = self.graph.stream(
            input,
            config, 
            stream_mode="updates"
            )
        print(response)
        return response