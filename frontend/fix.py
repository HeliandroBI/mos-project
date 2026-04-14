with open('src/Dashboard.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('(b as Record<string,number>)', '(b as any)')
c = c.replace('(a as Record<string,number>)', '(a as any)')
c = c.replace('(row as Record<string,number>)', '(row as any)')
with open('src/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('Dashboard OK')
