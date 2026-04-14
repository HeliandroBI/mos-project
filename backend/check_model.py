import sys
sys.path.insert(0, '.')
from app.models.models import ContaReceber
cols = [c.name for c in ContaReceber.__table__.columns]
print(cols)
