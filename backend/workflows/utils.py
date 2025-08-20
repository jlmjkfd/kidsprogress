

class FormHandler:
    def __init__(self, tools: dict):
        self.tools = tools
        
    def handle(self, inputs: dict) -> str:
        topic = inputs.get("topic_type")
        if topic == "Language_English_Writing":
            return self.tools["Language_English_Writing"].run(inputs)
        else:
            return "Unsupported form topic"
    
class VectorSearchEngine:
    def __init__(self, store):
        self.store = store
    def search(self, query: str) -> str:
        return "result"