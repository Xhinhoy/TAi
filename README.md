# TAi – Generador Inteligente de Itinerarios Turísticos

![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow)  
![License](https://img.shields.io/badge/license-MIT-blue)  
![Stack](https://img.shields.io/badge/stack-React%20Native%20%7C%20Flask%20%7C%20Firebase-green)

---

## Descripción
**TAi** es un proyecto académico desarrollado en el marco de la asignatura **Capstone 2025 – Ingeniería en Informática (DUOC UC)**.  
El sistema genera **itinerarios turísticos personalizados** mediante un motor de recomendación basado en **IA ligera** e integra **APIs externas** como *Google Places* y *TripAdvisor*.  

La aplicación considera **preferencias del usuario, ubicación actual, horarios y afluencia estimada** para optimizar la experiencia de viaje.

---

## Objetivos
- **General:**  
  Desarrollar una aplicación móvil híbrida que genere itinerarios turísticos personalizados integrando APIs externas y un motor de recomendación.  

- **Específicos:**  
  - Integrar Google Places y TripAdvisor para obtener datos en tiempo real.  
  - Implementar un motor de recomendación flexible usando el patrón **Strategy**.  
  - Diseñar modelos de datos escalables en **Firebase Firestore**.  
  - Aplicar pruebas de validación bajo buenas prácticas de la industria.  
  - Gestionar el proyecto bajo metodología **Scrum**, con planificación en fases y evidencias de avance.  

---

## Tecnologías
- **Frontend:** React Native (TypeScript, Expo, React Query, Zustand).  
- **Backend:** Python (Flask, Pydantic).
- **Base de Datos:** Firebase Firestore (con consultas geoespaciales).  
- **APIs externas:** Google Places, TripAdvisor.  
- **IA / Algoritmos:** Estrategias de recomendación (greedy, cultural, gastronómica).  
- **Gestión del Proyecto:** Scrum (Jira / GitHub Projects).  

---

## Arquitectura
El sistema se implementa con **Clean Architecture ligera**:  
- **Presentación (UI):** Pantallas y componentes en React Native.  
- **Aplicación (Casos de uso):** Hooks en frontend y servicios en backend.  
- **Datos (Infraestructura):** Repositorios en Firebase Firestore y adaptadores para APIs externas.  
- **Dominio (opcional):** Entidades puras como *Usuario*, *Lugar*, *Itinerario*.  

Patrones de diseño aplicados: **Strategy, Repository, Adapter/Facade, Chain of Responsibility (pipeline de filtros), Observer (eventos)**.

---

## Plan de Trabajo (Capstone)
El proyecto se organiza en 3 fases:  
1. **Definición (Semanas 1–4):** Propuesta, objetivos, plan de trabajo y diseño de arquitectura.  
2. **Desarrollo (Semanas 5–12):** Prototipo funcional con integración de APIs y base de datos.  
3. **Validación (Semanas 13–18):** Motor de recomendación, pruebas, ajustes y entrega final.  

📊 El plan detallado y la carta Gantt se encuentran en [`/project`](./project).  

---

## Equipo
- Nicolás Sabando  
- José Eskenazi  
- Nicolás Soto  

---

## Registro de Usuario con Email/Contraseña

### Configuración Inicial

1. **Variables de entorno:** Copia `.env.example` a `.env` y completa con tus credenciales de Firebase
2. **Firebase Console:**
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/)
   - Habilita **Authentication > Sign-in method > Email/Password**
   - Crea una base de datos **Firestore**
   - Aplica las reglas de seguridad desde `firestore.rules`
3. **Instalación:** `cd src/frontend && npm install`
4. **Ejecutar:** `npm start`

### Funcionalidades Implementadas

- ✅ **Registro completo** con validación en tiempo real
- ✅ **Medidor de fuerza de contraseña** con criterios específicos
- ✅ **Validación con Zod** (email, contraseña, confirmación, términos)
- ✅ **Manejo de errores** localizados al español
- ✅ **Bootstrap automático** de perfil en Firestore
- ✅ **Navegación post-registro** hacia onboarding o home
- ✅ **UI accesible** con labels, roles y hints
- ✅ **Tests unitarios e integración** con Jest

### Flujo de Usuario

1. **Registro:** Email + contraseña + aceptar términos
2. **Validación:** Cumplir criterios de seguridad (8+ chars, mayús/minús, número, especial)
3. **Creación:** Usuario en Firebase Auth + perfil en Firestore
4. **Redirección:** A selección de intereses o pantalla principal

### Pruebas

```bash
# Tests unitarios (esquemas, validaciones)
npm test tests/unit/auth.test.ts

# Tests de integración (componente Register)
npm test tests/integration/register.test.tsx
```

### Emuladores Firebase (Desarrollo)

```bash
# Instalar CLI de Firebase
npm install -g firebase-tools

# Inicializar emuladores
firebase init emulators

# Ejecutar emuladores locales
firebase emulators:start
```

---

## Evidencias
- [Documentos de definición y rúbricas](./docs)
- [Plan de trabajo y carta Gantt](./project)
- [Código fuente (frontend/backend)](./src)
- [Pruebas de validación](./tests)

---

## Licencia
Este proyecto se desarrolla con fines **académicos** dentro de la asignatura **Capstone 2025 – DUOC UC**.  
Licencia: [MIT](./LICENSE).  
