import os
import configparser
from pathlib import Path
from langchain.chat_models import init_chat_model

def load_or_create_config():
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

def load_llm():
    if not os.environ.get("GOOGLE_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = load_or_create_config()
    model = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
    return model

if __name__ == "__main__":
    model = load_llm()
    result = model.invoke("Hello, world!")
    print(result)