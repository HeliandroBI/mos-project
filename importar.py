import urllib.request, json

url = 'http://localhost:8000/api/contas-receber/import/csv'
filepath = r'C:\projetos\mos-project\contas_import.csv'
boundary = 'boundary12345'

with open(filepath, 'rb') as f:
    file_data = f.read()

body = (
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="contas_import.csv"\r\n' +
    'Content-Type: text/csv\r\n\r\n'
).encode() + file_data + ('\r\n--' + boundary + '--\r\n').encode()

req = urllib.request.Request(url, data=body)
req.add_header('Content-Type', 'multipart/form-data; boundary=' + boundary)
with urllib.request.urlopen(req) as resp:
    result = json.loads(resp.read())
    print('Inseridos:', result['inserted'], 'registros')
    if result.get('errors'):
        print('Erros:', len(result['errors']))
