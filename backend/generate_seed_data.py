import asyncio
import random
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.models import User, Tag, Note

TOPICS = [
    "Machine Learning", "Deep Learning", "Neural Networks", "Computer Vision",
    "Natural Language Processing", "Reinforcement Learning", "Linear Algebra", "Calculus",
    "Probability Theory", "Statistics", "Data Mining", "Big Data",
    "Distributed Systems", "Cloud Computing", "Docker", "Kubernetes",
    "Microservices", "REST API", "GraphQL", "WebSockets",
    "Frontend Development", "React", "Vue", "Angular",
    "Backend Development", "Node.js", "Python", "Go",
    "Database Design", "SQL", "PostgreSQL", "NoSQL",
    "MongoDB", "Redis", "Kafka", "RabbitMQ",
    "Algorithms", "Data Structures", "Graph Theory", "Dynamic Programming",
    "Quantum Computing", "Cryptography", "Blockchain", "Smart Contracts",
    "Cybersecurity", "Penetration Testing", "Malware Analysis", "Network Security",
    "Operating Systems", "Linux Kernel", "Memory Management", "File Systems" # 52 topics
]

TAGS = [
    {"name": "AI/ML (Демо)", "color": "#ff4b4b"},
    {"name": "Math (Демо)", "color": "#4b79ff"},
    {"name": "DevOps (Демо)", "color": "#4bffb8"},
    {"name": "Frontend (Демо)", "color": "#f1ff4b"},
    {"name": "Backend (Демо)", "color": "#ff4bf4"},
    {"name": "Bases (Демо)", "color": "#ffa74b"},
    {"name": "Security (Демо)", "color": "#4be8ff"}
]

async def generate():
    async with AsyncSessionLocal() as db:
        # Get admin user or first user
        result = await db.execute(select(User))
        user = result.scalars().first()
        
        if not user:
            print("База данных пуста (нет пользователей). Запустите сначала init_db.py")
            return

        print(f"Используем пользователя: {user.name}")

        # Create/Get tags
        db_tags = []
        for tag_data in TAGS:
            res = await db.execute(select(Tag).where(Tag.name == tag_data["name"]))
            existing_tag = res.scalar_one_or_none()
            if existing_tag:
                db_tags.append(existing_tag)
            else:
                t = Tag(name=tag_data["name"], color=tag_data["color"])
                db.add(t)
                db_tags.append(t)
        
        await db.flush()

        notes = []
        for i, topic in enumerate(TOPICS):
            note_tags = random.sample(db_tags, random.randint(1, 3))
            n = Note(
                title=topic,
                content=f"# {topic}\n\nСгенерированный тестовый контент для красивого отображения графа знаний. Тема охватывает базовые определения, ключевые подходы и взаимосвязи с другими дисциплинами.",
                is_published=True,
                author_id=user.id,
                views_count=random.randint(10, 2000)
            )
            n.tags = note_tags
            notes.append(n)

        # Connect the graph
        for i, note in enumerate(notes):
            links = []
            num_links = random.randint(1, 6) # each note connects to 1-6 others
            for _ in range(num_links):
                # Clusterization: 60% link to nearby index, 40% random leap
                if random.random() < 0.6:
                    target_idx = max(0, min(len(notes) - 1, i + random.randint(-5, 5)))
                else:
                    target_idx = random.randint(0, len(notes) - 1)
                
                # Avoid self links and duplicates
                if target_idx != i and notes[target_idx] not in links:
                    links.append(notes[target_idx])
            note.linked_notes = links
        
        db.add_all(notes)
        await db.commit()
        print(f"Сгенерировано {len(notes)} заметок и сотни связей!")

if __name__ == "__main__":
    asyncio.run(generate())
