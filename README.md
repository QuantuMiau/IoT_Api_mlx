# API IoT (Sin Docker)

Esta es una versión simplificada de la API, extraída sin las configuraciones de Docker para un despliegue más manual o para subir a GitHub de forma limpia.

## Requisitos Previos

- **Node.js**: Versión 18 o superior.
- **PostgreSQL**: Instalado localmente o accesible en alguna red.

## Configuración y Ejecución

1. **Instalar Dependencias**
   Abre una terminal en esta carpeta y ejecuta:
   ```bash
   npm install
   ```

2. **Configurar Entorno**
   - Haz una copia del archivo `.env.example` y renómbralo a `.env`.
   - Modifica las variables de entorno en tu `.env` según la configuración de tu base de datos PostgreSQL:
     ```env
     DB_HOST=localhost
     DB_PORT=5432
     DB_USER=postgres
     DB_PASSWORD=postgres
     DB_NAME=iot_db
     PORT=3002
     ```

3. **Base de Datos**
   - Asegúrate de tener PostgreSQL corriendo.
   - Crea la base de datos `iot_db` (o el nombre que configuraste) en tu servidor de PostgreSQL.
   - (El código existente se encarga de crear las tablas necesarias o deberás importar tu esquema SQL existente según corresponda).

4. **Arrancar el Servidor**
   ```bash
   npm start
   ```

La API estará disponible en `http://localhost:3002` (o el puerto configurado).
