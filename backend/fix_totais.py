with open('app/api/routes/contas.py', 'r', encoding='utf-8') as f:
    c = f.read()

# Adicionar total_liquido e total_retido filtrados
old = 'total_bruto = q.with_entities(func.sum(ContaReceber.vl_bruto)).scalar() or 0'
new = '''total_bruto = q.with_entities(func.sum(ContaReceber.vl_bruto)).scalar() or 0
    total_liquido = q.with_entities(func.sum(ContaReceber.vl_liquido)).scalar() or 0
    total_retido = q.with_entities(func.sum(ContaReceber.total_retido)).scalar() or 0'''
c = c.replace(old, new)

# Adicionar no retorno
c = c.replace(
    '"total": total, "total_bruto": round(total_bruto, 2)',
    '"total": total, "total_bruto": round(total_bruto, 2), "total_liquido": round(total_liquido, 2), "total_retido": round(total_retido, 2)'
)

with open('app/api/routes/contas.py', 'w', encoding='utf-8') as f:
    f.write(c)
print('OK')
