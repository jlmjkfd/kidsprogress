"""Seed test data for development."""
import asyncio
import sys
from pathlib import Path
from datetime import date
from dotenv import load_dotenv

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir.parent))

# Load environment variables from backend/.env
env_path = backend_dir / ".env"
load_dotenv(env_path)

from backend.db.connection import db
from backend.services.auth_service import AuthService
from backend.services.child_service import ChildService
from backend.services.device_service import DeviceService
from backend.models.user import UserCreate
from backend.models.child import ChildCreate


async def seed_data():
    """Seed test data into database."""
    print("Connecting to database...")
    await db.connect_db()
    database = db.get_database()

    # Initialize services
    auth_service = AuthService(database)
    child_service = ChildService(database)
    device_service = DeviceService(database)

    print("\n=== Creating Parent Account ===")

    # Delete existing parent if exists
    await database.users.delete_one({"email": "parent@test.com"})

    # Create parent account
    parent_data = UserCreate(
        email="parent@test.com",
        password="password123",
        full_name="Test Parent"
    )
    parent = await auth_service.create_user(parent_data)
    print(f"Created parent account: {parent.email}")
    print(f"Password: password123")
    print(f"Parent ID: {parent.id}")

    print("\n=== Creating Child Profiles ===")

    # Child 1: Alice (age 8, with PIN)
    child1_data = ChildCreate(
        name="Alice",
        date_of_birth=date(2016, 3, 15),  # ~8 years old
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
        pin_required=True,
        pin="1234"
    )
    child1 = await child_service.create_child(str(parent.id), child1_data)
    print(f"Created child: {child1.name} (DOB: {child1.date_of_birth}, PIN: 1234)")
    print(f"  ID: {child1.id}")

    # Child 2: Bob (age 10, no PIN)
    child2_data = ChildCreate(
        name="Bob",
        date_of_birth=date(2014, 7, 22),  # ~10 years old
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
        pin_required=False,
        pin=None
    )
    child2 = await child_service.create_child(str(parent.id), child2_data)
    print(f"Created child: {child2.name} (DOB: {child2.date_of_birth}, No PIN)")
    print(f"  ID: {child2.id}")

    # Child 3: Charlie (age 6, with PIN)
    child3_data = ChildCreate(
        name="Charlie",
        date_of_birth=date(2018, 11, 8),  # ~6 years old
        avatar_url="https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
        pin_required=True,
        pin="5678"
    )
    child3 = await child_service.create_child(str(parent.id), child3_data)
    print(f"Created child: {child3.name} (DOB: {child3.date_of_birth}, PIN: 5678)")
    print(f"  ID: {child3.id}")

    print("\n=== Creating Device Registration ===")

    # Register a test device
    device_token = "test-device-001"
    device = await device_service.register_device(
        device_token=device_token,
        device_name="Family Tablet",
        parent_id=str(parent.id),
        child_ids=[str(child1.id), str(child2.id), str(child3.id)]
    )
    print(f"Registered device: {device.device_name}")
    print(f"  Token: {device_token}")
    print(f"  Children: {len(device.child_ids)}")

    print("\n=== Test Data Summary ===")
    print(f"Parent: parent@test.com / password123")
    print(f"Children:")
    print(f"  - Alice (DOB: 2016-03-15, ~8 years) - PIN: 1234")
    print(f"  - Bob (DOB: 2014-07-22, ~10 years) - No PIN")
    print(f"  - Charlie (DOB: 2018-11-08, ~6 years) - PIN: 5678")
    print(f"Device Token: {device_token}")

    print("\n=== API Test URLs ===")
    print("Login as parent:")
    print('  POST http://localhost:8000/api/auth/login')
    print('  Body: {"email": "parent@test.com", "password": "password123"}')
    print("\nGet children:")
    print('  GET http://localhost:8000/api/children')
    print('  Header: Authorization: Bearer <token>')
    print("\nGet device children:")
    print(f'  GET http://localhost:8000/api/devices/{device_token}/children')
    print("\nChild login (Alice with PIN):")
    print('  POST http://localhost:8000/api/auth/child-login')
    print(f'  Body: {{"device_token": "{device_token}", "child_id": "{child1.id}", "pin": "1234"}}')

    await db.close_db()
    print("\n✓ Test data seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_data())
