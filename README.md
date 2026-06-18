# RK Perfil Comprador

App interna de RK Palanca Fontestad para enviar el perfil del comprador al captador por Slack.

## Qué hace
- Recoge datos del comprador e inmueble
- Checklist con 6 preguntas clave (honorarios, hipoteca, banco, vende para comprar...)
- Adjunta 3 documentos obligatorios: Oferta, Honorarios, Justificante
- Envía todo al canal Slack del captador seleccionado

## Deploy en Vercel
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/agalvez-tech/rk-perfil-comprador.git
git push -u origin main
```

## Configuración Slack
- Pulsa ⚙️ en el header e introduce el token `xoxb-...`
- Se guarda en localStorage del dispositivo
- Permisos: `chat:write`, `files:write`

## Desarrollo local
```bash
npm install && npm run dev
```
