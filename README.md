# TaskFlow - Tablero Kanban

TaskFlow es una aplicación web intuitiva para la gestión ágil de tareas mediante un sistema de tablero Kanban. 

Permite organizar el trabajo en diferentes columnas de estado (Por Hacer, En Proceso, Finalizado), reordenar tarjetas fácilmente arrastrando y soltando (Drag & Drop), buscar y filtrar tareas por prioridad, añadir fechas límite y cuenta con un modo oscuro integrado.

## 🚀 Cómo inicializar el proyecto

Para ejecutar el proyecto en tu máquina local, asegúrate de tener [Node.js](https://nodejs.org/) instalado y sigue estos tres sencillos pasos:

1. **Instalar las dependencias:**
   Abre una terminal en la carpeta raíz del proyecto y ejecuta:
   ```bash
   npm install
   ```

2. **Iniciar la base de datos (Backend):**
   El proyecto utiliza `json-server` para simular una API REST. Para levantar el backend, usa el siguiente comando en tu terminal:
   ```bash
   npm run api
   ```
   *(Esto iniciará la API en el puerto 3000, guardando los datos en `data/db.json`)*

3. **Iniciar la interfaz gráfica (Frontend):**
   Abre una **nueva pestaña o ventana de terminal** (dejando la anterior abierta) y ejecuta:
   ```bash
   npm run dev
   ```
   *(Esto iniciará un servidor de desarrollo y abrirá la aplicación en tu navegador, generalmente en `http://127.0.0.1:5500`)*

¡Y listo! Ya puedes empezar a crear y gestionar tus tareas.
