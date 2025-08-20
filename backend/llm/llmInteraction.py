from .load_model import load_llm
from langchain_core import runnables
def sendMessage(msg):
    model = load_llm()
    return model.invoke(msg)