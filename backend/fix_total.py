with open('app/api/routes/contas.py', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace(
    'total_bruto = db.query(func.sum(ContaReceber.vl_bruto)).scalar() or 0',
    'total_bruto = q.with_entities(func.sum(ContaReceber.vl_bruto)).scalar() or 0'
)
with open('app/api/routes/contas.py', 'w', encoding='utf-8') as f:
    f.write(c)
print('OK')
