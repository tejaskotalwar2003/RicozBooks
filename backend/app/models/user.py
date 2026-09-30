from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from app.database.session import Base

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
)

user_entities = Table(
    "user_entities",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("entity_id", Integer, ForeignKey("entities.id", ondelete="CASCADE"), primary_key=True)
)

user_companies = Table(
    "user_companies",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("company_id", Integer, ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
)

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    module = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    permissions = relationship("Permission", secondary=role_permissions, backref="roles")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    job_title = Column(String(100), default="Finance Team")
    profile_photo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    default_company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL", use_alter=True, name="fk_users_default_company_id"), nullable=True)
    default_entity_id = Column(Integer, ForeignKey("entities.id", ondelete="SET NULL", use_alter=True, name="fk_users_default_entity_id"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    roles = relationship("Role", secondary=user_roles, backref="users", lazy="joined")
    entities = relationship("Entity", secondary=user_entities, backref="authorized_users")
    companies = relationship("Company", secondary=user_companies, backref="members")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def primary_role(self) -> str:
        if self.roles:
            return self.roles[0].name
        return "VIEWER"

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_token = Column(String(255), nullable=False, index=True)
    device = Column(String(100), default="Desktop PC")
    browser = Column(String(100), default="Web Browser")
    os = Column(String(100), default="Operating System")
    ip_address = Column(String(50), nullable=True)
    location = Column(String(100), default="Current Location")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_active_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="sessions")


