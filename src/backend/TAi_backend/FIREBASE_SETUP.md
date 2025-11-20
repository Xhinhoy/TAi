# Configuración de Firebase

## Desplegar reglas de base de datos

Para corregir el error de índice de Firebase, necesitas desplegar las reglas definidas en `database.rules.json`.

### Opción 1: Mediante Firebase Console (Recomendado)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `proyectotai-cb31a`
3. En el menú lateral, ve a **Realtime Database** → **Reglas**
4. Copia y pega el contenido del archivo `database.rules.json`:

```json
{
  "rules": {
    "conversations": {
      "$sessionId": {
        "messages": {
          ".indexOn": ["timestamp"],
          ".read": "auth != null",
          ".write": "auth != null"
        },
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "cache": {
      "$category": {
        "$key": {
          ".read": true,
          ".write": true
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

5. Haz clic en **Publicar**

### Opción 2: Mediante Firebase CLI

Si tienes Firebase CLI instalado:

```bash
# Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto (si no está inicializado)
firebase init database

# Desplegar reglas
firebase deploy --only database
```

## Verificar que funciona

Después de desplegar las reglas, reinicia tu servidor backend:

```bash
# Detener el servidor (Ctrl+C)
# Reiniciar
python -m uvicorn app.main:app --reload --port 8000
```

Ahora el error `Index not defined` debería estar resuelto.

## Explicación del índice

El índice en `timestamp` permite hacer consultas ordenadas eficientemente:

```python
# Esta query requiere el índice
db.child('conversations').child(session_id).child('messages').order_by_child('timestamp').limit_to_last(limit).get()
```

Sin el índice, Firebase rechaza la consulta para proteger el rendimiento.
