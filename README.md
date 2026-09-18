# rk-perfil-comprador

App interna de **RK Palanca Fontestad** para enviar el perfil del comprador al captador por Slack, con extracción automática de datos desde la propuesta firmada mediante IA.

---

## Funcionalidades

- **Extracción automática con IA** — sube la propuesta firmada (PDF, Word, foto o escaneado) y Claude extrae automáticamente: nombre del comprador, NIF, teléfono, dirección del inmueble, ref. comercial y precio (vía el backend, con la key de Anthropic en Secret Manager — ningún agente necesita su propia key)
- **Checklist de 6 preguntas** con lógica condicional (honorarios, hipoteca+banco+tasación, vende para comprar, pérdida de 1.000€, arras)
- **Selector de captador** con los 22 agentes ordenados alfabéticamente
- **3 documentos adjuntos obligatorios** (Oferta, Honorarios, Justificante) — se suben a Slack junto con el mensaje
- **Envío por Slack** al canal del captador seleccionado, con botones **✅ Aceptado / ❌ Rechazado**
- **Contador de envíos y de aceptados**, y aviso automático a comprador + vendedor cuando el captador marca "Aceptado"

---

## Arquitectura

Esta app ya **no envía nada directamente a Slack desde el navegador**. El frontend llama a un
backend (`backend/`, Cloud Run — proyecto GCP `contratos-498808`) que:

1. Publica el mensaje en Slack con botones interactivos y sube los 3 adjuntos
2. Guarda el envío en Firestore e incrementa el contador `total_enviados`
3. Recibe la pulsación del botón (Slack Interactivity), actualiza el contador
   (`total_aceptados` / `total_rechazados`) y edita el mensaje
4. Si es "Aceptado": busca el/los vendedor(es) en IA Gestión por la
   *Ref. comercial* del formulario (== `Ref_CRM`, confirmado) y avisa por
   SMS + email a comprador y vendedor

El token de Slack, las credenciales de IA Gestión/Altiria/Gmail y la API Key
de Anthropic (extracción con IA) viven en el backend (Secret Manager), no en
el dispositivo de cada agente.

Ver `backend/main.py` para el código del servicio.

---

## Requisitos

- Node.js ≥ 18
- npm ≥ 9

---

## Instalación local

```bash
git clone https://github.com/agalvez-tech/rk-perfil-comprador.git
cd rk-perfil-comprador
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

---

## Actualizar en GitHub

Cada vez que hagas cambios:

```bash
git add .
git commit -m "descripción del cambio"
git push
```

Vercel redespliega automáticamente.

---

## Primer despliegue en Vercel (solo la primera vez)

### 1. Subir el código a GitHub

```bash
cd rk-perfil-comprador
git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/agalvez-tech/rk-perfil-comprador.git
git push -u origin main
```

### 2. Conectar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repositorio `agalvez-tech/rk-perfil-comprador`
3. Vercel detecta Vite automáticamente:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Pulsa **Deploy**

### 3. Variables de entorno (Vercel)

En **Project Settings → Environment Variables** añade:

| Variable | Valor |
|----------|-------|
| `VITE_BACKEND_URL` | URL del servicio Cloud Run `perfil-comprador-backend` |
| `VITE_BACKEND_API_KEY` | La clave `PERFIL_API_KEY` configurada en el backend (pídela, no está en este repo) |

---

## Configuración inicial de la app (en el dispositivo)

Pulsa **⚙️** en el header y rellena tu nombre (aparece en el mensaje enviado al captador). Se guarda en `localStorage` del dispositivo.

---

## Estructura del proyecto

```
rk-perfil-comprador/
├── public/
│   ├── logo-rk.png
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AppHeader          # Header con botón ⚙️ y modal de ajustes integrado
│   │   ├── Field              # Campo de formulario reutilizable
│   │   ├── PerfilComprador    # Formulario completo (extracción IA + checklist + adjuntos)
│   │   ├── SectionCard        # Tarjeta de sección
│   │   ├── SettingsModal      # Modal de configuración Slack + API Key
│   │   ├── StepShared.module.css
│   │   └── SuccessScreen      # Pantalla de confirmación de envío
│   ├── data/
│   │   └── index.js           # Lista de 22 captadores con canales Slack
│   ├── App.jsx                # Estado global: token, agente, pantalla éxito
│   └── index.css
├── perfil-comprador.html      # Versión standalone (sin npm) para uso directo
├── vercel.json
├── vite.config.js
└── package.json
```

---

## Versión standalone (sin instalar nada)

El archivo `perfil-comprador.html` es la app completa en un solo fichero HTML. Se puede abrir directamente en el navegador o alojar en cualquier servidor estático sin necesidad de npm ni build.

---

## Añadir o modificar captadores

Edita `src/data/index.js` y `perfil-comprador.html` (sección `const CAPTADORES`):

```js
{ name: 'Nuria Núñez', channel: 'C0B5GNRMLFQ', initials: 'NN' },
```

---

## Tecnologías

- React 19 + Vite 8
- Anthropic API (`claude-sonnet-4-6`) — extracción de datos de documentos
- Slack Web API (`chat.postMessage`, `files.upload`)
- CSS Modules
- Identidad visual RK: Montserrat · #CF731B · Negro
