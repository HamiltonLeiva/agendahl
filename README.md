    # Agenda (Online + Offline)

    Sistema de agenda colaborativa inspirado en Google Calendar, con tareas compartidas, responsables, alertas 5 minutos antes, reportes de cumplimiento y soporte responsivo para movil, tablet, desktop y smart TV.

    ## Tecnologias elegidas

    - Frontend: React + TypeScript + Vite
    - Base de datos en tiempo real: Firebase Firestore
    - Autenticacion multiusuario: Firebase Auth (Google)
    - Offline: Firestore IndexedDB + PWA (Service Worker)
    - Fechas y horarios: Day.js

    ## Funcionalidades implementadas

    - Agenda compartida para multiples usuarios
    - Crear, editar, completar y eliminar tareas
    - Asignacion de uno o varios responsables por tarea
    - Filtros por texto, estado y responsable
    - Alertas visuales y notificaciones del navegador 5 minutos antes
    - Reportes de cumplimiento por responsable
    - Sincronizacion online/offline automatica
    - Instalacion como app (PWA)

    ## Requisitos

    - Node.js 20+
    - Proyecto de Firebase (plan gratuito Spark)

    ## Configuracion local

    1. Instala dependencias:

    ```bash
    npm install
    ```

    2. Crea tu archivo de entorno:

    ```bash
    cp .env.example .env
    ```

    3. Completa las variables de Firebase en `.env`.

    4. Ejecuta en desarrollo:

    ```bash
    npm run dev
    ```

    5. Compila para produccion:

    ```bash
    npm run build
    ```

    ## Despliegue gratuito recomendado

    ## Opcion A: Firebase Hosting (recomendada)

    1. `npm install -g firebase-tools`
    2. `firebase login`
    3. `firebase init hosting`
    4. Directorio publico: `dist`
    5. SPA rewrite: `yes`
    6. `npm run build && firebase deploy`

    ## Opcion B: Vercel o Netlify

    - Frontend en Vercel/Netlify (gratis)
    - Backend y base de datos en Firebase (gratis)
    - Configura variables `VITE_FIREBASE_*` en el panel del proveedor

    ## Estructura principal

    - `src/App.tsx`: layout general, tabs agenda/reportes, filtros y acciones
    - `src/hooks/useTasks.ts`: CRUD y sincronizacion en tiempo real
    - `src/hooks/useTaskAlerts.ts`: alertas 5 minutos antes
    - `src/components/TaskForm.tsx`: formulario validado para tareas
    - `src/components/TaskBoard.tsx`: vista de agenda por dia
    - `src/components/ReportsPanel.tsx`: indicadores de cumplimiento

    ## Escalabilidad

    La arquitectura usa Firestore porque escala bien para muchas operaciones diarias, soporta sincronizacion en tiempo real y persistencia offline sin infraestructura adicional de pago.

