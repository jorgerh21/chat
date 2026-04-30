import requests
resp = requests.post("https://chatbot.discoduro.app/chat", json={"message": "¿Qué cursos ofreces?"})
print(resp.json()["respuesta"])