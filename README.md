# rk-perfil-comprador

App interna de **RK Palanca Fontestad** para enviar el perfil del comprador al captador por Slack, con extracción automática de datos desde la propuesta firmada mediante IA.

---

## Funcionalidades

- **Extracción automática con IA** — sube la propuesta firmada (PDF, Word, foto o escaneado) y Claude extrae automáticamente: nombre del comprador, NIF, teléfono, dirección del inmueble, ref. comercial y precio
- **Checklist de 6 preguntas** con lógica condicional (honorarios, hipoteca+banco+tasación, vende para comprar, pérdida de 1.000€, arras)
- **Selector de captador** con los 22 agentes ordenados alfabéticamente
- **3 documentos adjuntos obligatorios** (Oferta, Honorarios, Justificante) — se suben a Slack junto con el mensaje
- **Envío por Slack** al canal del captador seleccionado

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

> No se necesitan variables de entorno — el token Slack y la API Key de Anthropic se guardan en el dispositivo del usuario.

---

## Configuración inicial de la app (en el dispositivo)

Pulsa **⚙️** en el header y rellena:

| Campo | Dónde conseguirlo |
|-------|-------------------|
| Token Slack Bot (`xoxb-...`) | Slack API → Tu app → OAuth Tokens |
| API Key Anthropic (`sk-ant-...`) | console.anthropic.com → API Keys |

Ambos se guardan en `localStorage` del dispositivo. No se envían a ningún servidor.

**Permisos necesarios para el bot de Slack:** `chat:write`, `files:write`

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
