"""Root conftest for pytest configuration."""
import sys
from pathlib import Path

# Add parent directory to path so 'backend' module can be imported
backend_root = Path(__file__).parent
parent_dir = backend_root.parent
sys.path.insert(0, str(parent_dir))
