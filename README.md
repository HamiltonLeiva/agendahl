# Agenda Compartida (Online + Offline)

Sistema de agenda colaborativa.
Incluye multiusuario, vistas de calendario avanzadas, alertas, reportes y soporte offline con PWA.

## Estado actual

El proyecto ya tiene implementadas las Fases 1, 2 y 3:

- Fase 1: dashboard calendario estilo Google Calendar (mensual, semanal y quincenal)
- Fase 2: vista diaria por horas y drag-and-drop para reprogramar tareas
- Fase 3: pulido UX/UI (animaciones, densidad visual compacta/amplia, refinamientos responsive)

## Stack tecnico

- Frontend: React 18 + TypeScript + Vite
- Base de datos: Firebase Firestore (tiempo real)
- Autenticacion: Firebase Auth (Google)
- Formularios y validacion: React Hook Form + Zod
- Fechas: Day.js
- Offline/PWA: Firestore local cache + Service Worker (vite-plugin-pwa)

## Funcionalidades implementadas

- Agenda multiusuario con inicio de sesion Google
- Crear, editar, completar, reabrir y eliminar tareas
- Asignacion de uno o varios responsables por tarea
- Filtros por texto, estado y responsable
- Vistas de agenda: diaria, mensual, semanal y quincenal
- Mini calendario lateral para navegacion rapida
- Drag-and-drop para mover tareas entre dias y horas
- Alertas visuales y notificaciones 5 minutos antes de iniciar tareas
- Reportes de cumplimiento por responsable
- Soporte online/offline automatico
- Instalacion como app (PWA)

## Requisitos

- Node.js 20 o superior
- Proyecto Firebase (Spark gratuito funciona)

## Variables de entorno

Crear archivo `.env` basado en `.env.example`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_ID=  # opcional, si no usas Firestore default
```

## Configuracion local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env` desde plantilla:

```bash
copy .env.example .env
```

Nota: en macOS/Linux usa `cp .env.example .env`.

3. Completar variables Firebase en `.env`.

4. Iniciar desarrollo:

```bash
npm run dev
```

5. Compilar produccion:

```bash
npm run build
```

6. Vista previa local de build:

```bash
npm run preview
```

## Scripts disponibles

- `npm run dev`: entorno de desarrollo
- `npm run build`: compilacion TypeScript + build Vite
- `npm run lint`: analisis de codigo con ESLint
- `npm run preview`: servir build localmente

## Arquitectura principal

- `src/App.tsx`: shell principal, navegacion, filtros, calendario y modales
- `src/components/CalendarGrid.tsx`: vista calendario mensual/semanal/quincenal
- `src/components/DayTimeline.tsx`: vista diaria por franjas horarias
- `src/components/TaskForm.tsx`: formulario de tareas
- `src/components/ReportsPanel.tsx`: reportes por responsable
- `src/hooks/useTasks.ts`: CRUD y suscripcion en tiempo real de tareas
- `src/hooks/useUsers.ts`: suscripcion de usuarios
- `src/hooks/useTaskAlerts.ts`: motor de alertas y notificaciones
- `src/lib/firebase.ts`: inicializacion Firebase y cache local Firestore

## Build y performance

- Code splitting con carga diferida para vistas/componentes pesados
- Chunks manuales para vendor React/Firebase/utilidades
- Build actual sin chunks mayores a 500 kB

## Despliegue gratuito recomendado

### Opcion A: Firebase Hosting

1. `npm install -g firebase-tools`
2. `firebase login`
3. `firebase init hosting`
4. Directorio publico: `dist`
5. SPA rewrite: `yes`
6. `npm run build && firebase deploy`

### Opcion B: Vercel o Netlify

- Publicar frontend en Vercel/Netlify
- Mantener Firebase para Auth + Firestore
- Configurar variables `VITE_FIREBASE_*` en el panel del proveedor

## Notas operativas

- Firestore usa cache persistente multi-tab para mejor experiencia offline.
- Service Worker se registra en produccion.
- Si aparece error `permission-denied`, revisar reglas de Firestore y autenticacion activa.

