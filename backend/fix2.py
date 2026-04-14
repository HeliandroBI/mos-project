with open('src/pages/ContasPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('new Blob([r.data])', 'new Blob([r.data as any])')
with open('src/pages/ContasPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

with open('src/pages/SetupPage.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('holidaysAPI.list(year, state', 'holidaysAPI.list(String(year), state')
c = c.replace('qualtechAPI.getProject(wo)', 'qualtechAPI.listProjects(String(wo))')
c = c.replace('projectsAPI.delete(wo)', 'projectsAPI.delete(String(wo))')
with open('src/pages/SetupPage.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('OK')
