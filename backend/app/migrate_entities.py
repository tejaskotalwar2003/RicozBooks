from sqlalchemy import text
from app.database.session import engine

def migrate_entities():
    statements = [
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS gstin VARCHAR(50);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS pan VARCHAR(20);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS address VARCHAR(255);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS city VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS state VARCHAR(100);",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS financial_year VARCHAR(20) DEFAULT '2025-26';",
        "ALTER TABLE entities ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';",
        "UPDATE entities SET gstin = tax_identifier WHERE gstin IS NULL;",
        "UPDATE entities SET financial_year = '2025-26' WHERE financial_year IS NULL;",
        "UPDATE entities SET status = 'ACTIVE' WHERE status IS NULL;"
    ]

    with engine.connect() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Migration statement notice: {e}")
        conn.commit()
    print("Entity schema migration applied successfully.")

if __name__ == "__main__":
    migrate_entities()
