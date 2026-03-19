import asyncio
import sys
from pathlib import Path

# Добавляем корень бэкенда в пути поиска модулей
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import delete, select
from app.core.database import AsyncSessionLocal
from app.models.models import Note, Tag, Comment, User, Role, ActivityLog, RoleName

async def purge_data():
    """
    Удаляет все данные, кроме ролей и администратора.
    Удаляет всех пользователей, кроме 'admin'.
    """
    async with AsyncSessionLocal() as db:
        print("Начинаю очистку базы данных...")
        
        # 1. Удаляем комментарии
        print("- Удаление комментариев...")
        await db.execute(delete(Comment))
        
        # 2. Удаляем логи активности
        print("- Удаление логов...")
        await db.execute(delete(ActivityLog))
        
        # 3. Удаляем заметки (связи note_tags и note_links удалятся по каскаду или удалим их явно если нужно)
        print("- Удаление заметок...")
        # Note: note_tags и note_links — это Table объекты, SQLAlchemy delete на них работает
        await db.execute(delete(Note))
        
        # 4. Удаляем теги
        print("- Удаление тегов...")
        await db.execute(delete(Tag))
        
        # 5. Удаляем пользователей (кроме админа)
        print("- Удаление пользователей (кроме админа)...")
        # Получаем роль админа
        admin_role_q = await db.execute(select(Role).where(Role.name == RoleName.ADMIN))
        admin_role = admin_role_q.scalar_one_or_none()
        
        if admin_role:
            await db.execute(delete(User).where(User.role_id != admin_role.id))
        else:
            print("! Роль администратора не найдена. Будьте осторожны.")
            # Если роли нет, удаляем всех кроме первого пользователя (обычно это админ)
            first_user_q = await db.execute(select(User).order_by(User.id))
            first_user = first_user_q.scalars().first()
            if first_user:
                 await db.execute(delete(User).where(User.id != first_user.id))
        
        await db.commit()
        print("База данных успешно очищена!")

if __name__ == "__main__":
    asyncio.run(purge_data())
