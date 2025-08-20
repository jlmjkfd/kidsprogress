import configparser
import os
from pathlib import Path
from typing import Optional
from langchain.chat_models import init_chat_model

class LLMProvider:
    _llmInstance=None
    
    @classmethod
    def _get_api_key(cls, apiKeyName:str):
        config = configparser.ConfigParser()
        config_file = Path("config.ini")
        
        # Try to read the existing configuration file
        if config_file.exists():
            config.read(config_file)
            if 'DEFAULT' in config and apiKeyName in config['DEFAULT']:
                return config['DEFAULT'][apiKeyName]
        
        api_key = input(f"Enter {apiKeyName}: ")
        
        # Write to the configuration file
        if not config.has_section('DEFAULT'):
            config['DEFAULT'] = {}
        config['DEFAULT'][apiKeyName] = api_key
        with open(config_file, 'w') as f:
            config.write(f)
        
        return api_key
    
    @classmethod
    def get_llm(cls, provider: str = "google_genai", model: str = "gemini-2.5-flash", apiKeyName: str = "GOOGLE_API_KEY"):
        if cls._llmInstance is not None:
            return cls._llmInstance
        
        if not os.environ.get(apiKeyName):
            os.environ[apiKeyName] = cls._get_api_key(apiKeyName)
        llm = init_chat_model(model, model_provider=provider)
        cls._llmInstance = llm
        return llm