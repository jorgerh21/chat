import requests
import csv
import sys
import re

# ========== CONFIGURACIÓN ==========
API_BASE_URL = "https://chatbot.discoduro.app"   # Cambia si tu servidor corre en otro puerto/dominio
TIMEOUT = 30
CSV_FILE = "config.csv"                  # Archivo obligatorio

# ========== CARGAR CSV (SOLO LECTURA) ==========
def cargar_config_csv(ruta_csv):
    """
    Carga el archivo config.csv.
    Lanza excepción si no existe o tiene formato incorrecto.
    """
    datos = []
    try:
        with open(ruta_csv, mode='r', encoding='utf-8') as archivo:
            lector = csv.DictReader(archivo)
            # Columnas esperadas: id, pregunta, respuesta, descripcion, palabras_clave
            for fila in lector:
                fila['id'] = int(fila['id'])
                datos.append(fila)
        if not datos:
            print("❌ El archivo CSV está vacío.")
            sys.exit(1)
        print(f"✅ Cargadas {len(datos)} preguntas desde {ruta_csv}")
        return datos
    except FileNotFoundError:
        print(f"❌ Error: No se encontró el archivo {ruta_csv}. Debes crearlo manualmente.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error al leer CSV: {e}")
        sys.exit(1)

# ========== CONEXIÓN A LLAMA.CPP ==========
def llamar_api_clasificacion(mensaje_usuario, lista_preguntas):
    """
    Envía el mensaje a llama.cpp para que seleccione el ID de la pregunta más similar.
    """
    opciones = "\n".join([f"ID {item['id']}: {item['pregunta']}" for item in lista_preguntas])
    
    system_prompt = (
        "Eres un clasificador de intenciones. A continuación tienes una lista de preguntas predefinidas con sus IDs.\n"
        f"{opciones}\n"
        "Lee el mensaje del usuario y determina a cuál de esas preguntas se refiere principalmente. "
        "Responde ÚNICAMENTE con el número del ID (un entero), sin texto adicional."
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": mensaje_usuario}
    ]
    
    url = f"{API_BASE_URL}/chat/completions"
    payload = {
        "messages": messages,
        "max_tokens": 10,
        "temperature": 0.0,
        "stop": ["\n"]
    }
    
    try:
        resp = requests.post(url, json=payload, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        respuesta_raw = data["choices"][0]["message"]["content"].strip()
        numeros = re.findall(r'\d+', respuesta_raw)
        if numeros:
            id_elegido = int(numeros[0])
            ids_validos = [item['id'] for item in lista_preguntas]
            if id_elegido in ids_validos:
                return id_elegido
        # Si no se obtuvo ID válido, usar el primero como fallback
        return lista_preguntas[0]['id']
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: No se pudo conectar a {API_BASE_URL}. ¿Está corriendo llama-server?")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error en la API: {e}")
        return lista_preguntas[0]['id']

def obtener_respuesta_por_id(id_buscado, lista_datos):
    for item in lista_datos:
        if item['id'] == id_buscado:
            return item['respuesta']
    return "Lo siento, no tengo una respuesta para eso."

# ========== INTERACCIÓN EN CONSOLA ==========
def main():
    datos_csv = cargar_config_csv(CSV_FILE)
    
    print("\n🤖 Asistente de venta de cursos (llama.cpp + respuestas predefinidas)")
    print("Escribe 'salir' o 'exit' para terminar.\n")
    
    while True:
        usuario = input("Tú: ").strip()
        if usuario.lower() in ["salir", "exit", "quit"]:
            print("¡Hasta luego!")
            break
        if not usuario:
            continue
        
        id_match = llamar_api_clasificacion(usuario, datos_csv)
        print(f"[DEBUG] ID detectado: {id_match}")  # Opcional, puedes comentar
        
        respuesta = obtener_respuesta_por_id(id_match, datos_csv)
        print(f"Asistente: {respuesta}\n")

if __name__ == "__main__":
    main()