"""
Backend de Perfil Comprador -- RK Palanca
==========================================
Cloud Run HTTP. Sustituye el envio directo a Slack desde el navegador.

  POST /enviar               -> recibe el formulario (mensaje ya compuesto por
                                 el frontend) + 3 archivos, publica en Slack
                                 con botones Aceptado/Rechazado, guarda el
                                 registro en Firestore e incrementa el
                                 contador de envios.
  POST /slack/interactions   -> recibe la pulsacion del boton (Aceptado /
                                 Rechazado), actualiza el estado + contador,
                                 edita el mensaje de Slack (quita botones), y
                                 si es "Aceptado" avisa a comprador + vendedor
                                 (vendedor sacado de IA Gestion por
                                 referencia).
  GET  /stats                 -> contadores actuales.
"""

import base64
import json
import logging
import math
import os
import threading
import uuid
from email.mime.text import MIMEText

import requests
from flask import Flask, jsonify, request
from google.cloud import firestore
from google.oauth2 import service_account
from googleapiclient.discovery import build
from slack_sdk.signature import SignatureVerifier

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

db = firestore.Client()
COL_ENVIOS = "perfil_comprador_envios"
STATS_COL, STATS_DOC = "perfil_comprador_stats", "global"

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
SLACK_SIGNING_SECRET = os.environ["SLACK_SIGNING_SECRET"]
verifier = SignatureVerifier(SLACK_SIGNING_SECRET)

IA_USER = os.environ["IAGESTION_USER"]
IA_PASSWORD = os.environ["IAGESTION_PASS"]
IA_BASE_URL = "https://pasarelas.iagestion.com/api-gestioninmo/v2"

ALTIRIA_USER = os.environ["ALTIRIA_USER"]
ALTIRIA_API_PASS = os.environ["ALTIRIA_API_PASS"]
ALTIRIA_FROM = os.environ.get("ALTIRIA_FROM", "RKPalanca")
ALTIRIA_URL = "https://api.altiria.com/api/rest/sms"

EMAIL_FROM = os.environ.get("EMAIL_FROM", "info@inmobiliariapalanca.com")
GOOGLE_SERVICE_ACCOUNT_FILE = os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE", "/secrets/service_account.json")

URL_PROCESO_OFERTA = os.environ.get("URL_PROCESO_OFERTA", "https://www.inmobiliariapalanca.com/tu-proceso/?paso=oferta")

# TEST MODE -- redirige todos los envios a comprador/vendedor a un destinatario fijo
TEST_MODE = os.environ.get("TEST_MODE", "false").lower() == "true"
TEST_PHONE = os.environ.get("TEST_PHONE", "")
TEST_EMAIL = os.environ.get("TEST_EMAIL", "")

# Clave compartida simple para /enviar -- el endpoint es publico (el navegador no
# puede autenticarse con IAM) y sin esto cualquiera con la URL podria spamear los
# canales de Slack y gastar la cuota de Altiria/Gmail.
PERFIL_API_KEY = os.environ["PERFIL_API_KEY"]


# ---------------------------------------------------------------------------
# IA Gestion -- vendedor(es) por referencia
# ---------------------------------------------------------------------------

def ia_post(endpoint, params):
    payload = {"usuario": IA_USER, "password": IA_PASSWORD, **params}
    r = requests.post(f"{IA_BASE_URL}/{endpoint}/", data=payload, timeout=15)
    r.raise_for_status()
    return r.json()


def obtener_propietarios_inmueble(referencia):
    """
    Dada la 'Ref. comercial' del formulario (== Ref_CRM de IA Gestion,
    confirmado), devuelve la lista de propietarios con {nombre, telefono, email}.
    """
    if not referencia:
        return []
    data = ia_post("inmueble", {"Ref": referencia})
    inmueble = data.get("inmueble") if isinstance(data, dict) else None
    if not inmueble:
        return []
    id_inmueble = inmueble.get("Id")
    data_prop = ia_post("consultar_propietarios", {"Id_inmueble": id_inmueble})
    propietarios_raw = data_prop.get("Propietarios", [])
    resultado = []
    for p in propietarios_raw:
        nombre = f"{p.get('Nombre', '')} {p.get('Apellidos', '')}".strip() or "Propietario"
        telefono = p.get("Movil") or p.get("Telefono") or ""
        email = p.get("Email") or p.get("SegundoEmail") or ""
        if telefono or email:
            resultado.append({"nombre": nombre, "telefono": telefono, "email": email})
    return resultado


# ---------------------------------------------------------------------------
# SMS / Email (mismo patron que el resto de proyectos RK)
# ---------------------------------------------------------------------------

def normalizar_sms(texto):
    abreviaturas = {
        "Mª": "Maria", "mª": "Maria", "Dª": "Dona", "dª": "Dona",
        "Jª": "Josefa", "Fª": "Francisca", "Aª": "Ana",
    }
    for a, e in abreviaturas.items():
        texto = texto.replace(a, e)
    reemplazos = {
        "ª": "a", "º": "o",
        "’": "'", "‘": "'",
        "“": '"', "”": '"',
        "–": "-", "—": "-",
    }
    for o, d in reemplazos.items():
        texto = texto.replace(o, d)
    return texto


def enviar_sms(telefono, mensaje):
    if not telefono:
        return
    mensaje = normalizar_sms(mensaje)
    tel = telefono.strip().lstrip("+")
    if not tel.startswith("34"):
        tel = f"34{tel}"
    # Altiria trocea en partes de 153 caracteres (GSM); por defecto solo permite 1
    # (160 car.) y falla con error 105 "Text message too long" si el texto no
    # cabe en las partes solicitadas.
    partes = min(15, max(1, math.ceil(len(mensaje) / 153)))
    token = base64.b64encode(f"{ALTIRIA_USER}:{ALTIRIA_API_PASS}".encode()).decode()
    headers = {"Content-Type": "application/json", "Authorization": f"Basic {token}"}
    payload = {"to": [tel], "from": ALTIRIA_FROM, "message": mensaje, "parts": partes}
    r = requests.post(ALTIRIA_URL, json=payload, headers=headers, timeout=15)
    if not r.ok:
        log.error(f"Error Altiria {r.status_code}: {r.text}")
    r.raise_for_status()


def enviar_email_html(destinatario, asunto, html):
    if not destinatario:
        return
    creds = service_account.Credentials.from_service_account_file(
        GOOGLE_SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/gmail.send"],
        subject=EMAIL_FROM,
    )
    service = build("gmail", "v1", credentials=creds)
    mime = MIMEText(html, "html", "utf-8")
    mime["to"] = destinatario
    mime["from"] = EMAIL_FROM
    mime["subject"] = asunto
    raw = base64.urlsafe_b64encode(mime.as_bytes()).decode()
    service.users().messages().send(userId="me", body={"raw": raw}).execute()


def mensaje_sms_oferta_aceptada():
    return (
        f"Enhorabuena! La oferta de la venta de tu propiedad ha sido aceptada, "
        f"te compartimos un enlace con los siguientes pasos a seguir: {URL_PROCESO_OFERTA}"
    )


def mensaje_email_html_oferta_aceptada():
    return f"""\
<html>
<body style="font-family:Arial,sans-serif;font-size:15px;color:#333;max-width:600px;margin:auto;">
  <p>¡Hola!</p>
  <p>
    <strong>¡Enhorabuena! La oferta de la venta de tu propiedad ha sido aceptada.</strong><br>
    Te compartimos un enlace con los siguientes pasos a seguir:
  </p>
  <p>
    <a href="{URL_PROCESO_OFERTA}"
       style="display:inline-block;background:#cf731b;color:#fff;padding:12px 24px;
              border-radius:6px;text-decoration:none;font-weight:bold;">
      Ver siguientes pasos
    </a>
  </p>
  <p style="font-size:13px;color:#666;">
    O copia este enlace en tu navegador:<br>
    <a href="{URL_PROCESO_OFERTA}" style="color:#cf731b;">{URL_PROCESO_OFERTA}</a>
  </p>
  <p>Si tienes cualquier duda, estamos a tu disposición.<br>
  Un saludo,<br>
  <strong>RK Palanca Fontestad</strong></p>
</body>
</html>"""


def notificar_oferta_aceptada(comprador, vendedores):
    """Envia SMS + email de oferta aceptada a comprador y a cada vendedor."""
    msg_sms = mensaje_sms_oferta_aceptada()
    msg_email = mensaje_email_html_oferta_aceptada()
    asunto = "¡Enhorabuena, oferta aceptada! — RK Palanca Fontestad"

    destinatarios = []
    if comprador.get("telefono") or comprador.get("email"):
        destinatarios.append(comprador)
    destinatarios.extend(vendedores)

    enviados = []
    for persona in destinatarios:
        tel = TEST_PHONE if TEST_MODE else persona.get("telefono", "")
        email = TEST_EMAIL if TEST_MODE else persona.get("email", "")
        if TEST_MODE:
            log.info(f"[TEST] SMS -> {tel} | Email -> {email} | {persona.get('nombre')}")
        try:
            if tel:
                enviar_sms(tel, msg_sms)
        except Exception as e:
            log.error(f"Error SMS oferta aceptada ({persona.get('nombre')}): {e}")
        try:
            if email:
                enviar_email_html(email, asunto, msg_email)
        except Exception as e:
            log.error(f"Error email oferta aceptada ({persona.get('nombre')}): {e}")
        enviados.append(persona.get("nombre"))
    return enviados


# ---------------------------------------------------------------------------
# Slack
# ---------------------------------------------------------------------------

def resolve_channel(destino):
    """
    Los 'channel' de los captadores son IDs de usuario (U...) -- chat.postMessage
    los acepta directamente y abre el DM, pero otros metodos (como
    files.completeUploadExternal) exigen el ID real de conversacion (D...).
    Lo resolvemos siempre con conversations.open para evitar 'invalid_arguments'.
    """
    if not destino.startswith("U"):
        return destino
    r = requests.post(
        "https://slack.com/api/conversations.open",
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
        data={"users": destino},
        timeout=10,
    )
    j = r.json()
    if not j.get("ok"):
        raise RuntimeError(f"conversations.open: {j.get('error')}")
    return j["channel"]["id"]


def slack_post_message(channel, blocks, text_fallback):
    r = requests.post(
        "https://slack.com/api/chat.postMessage",
        json={"channel": channel, "blocks": blocks, "text": text_fallback},
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
        timeout=10,
    )
    j = r.json()
    if not j.get("ok"):
        raise RuntimeError(f"chat.postMessage: {j.get('error')}")
    return j


def slack_update_message(channel, ts, blocks, text_fallback):
    r = requests.post(
        "https://slack.com/api/chat.update",
        json={"channel": channel, "ts": ts, "blocks": blocks, "text": text_fallback},
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
        timeout=10,
    )
    j = r.json()
    if not j.get("ok"):
        log.error(f"chat.update: {j.get('error')}")


def slack_upload_file(channel, file_storage, title):
    """
    Slack deprecó files.upload -- flujo nuevo en 3 pasos:
    1. getUploadURLExternal: pide una URL de subida para el fichero.
    2. Subir el fichero (POST directo, sin auth) a esa URL.
    3. completeUploadExternal: finaliza y comparte el fichero en el canal/DM.
    """
    if not file_storage:
        return
    contenido = file_storage.read()

    r1 = requests.post(
        "https://slack.com/api/files.getUploadURLExternal",
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}"},
        data={"filename": file_storage.filename, "length": len(contenido)},
        timeout=15,
    )
    j1 = r1.json()
    if not j1.get("ok"):
        raise RuntimeError(f"files.getUploadURLExternal ({title}): {j1.get('error')}")

    r2 = requests.post(
        j1["upload_url"],
        files={"file": (file_storage.filename, contenido, file_storage.mimetype)},
        timeout=30,
    )
    if not r2.ok:
        raise RuntimeError(f"subida de fichero ({title}): HTTP {r2.status_code}")

    r3 = requests.post(
        "https://slack.com/api/files.completeUploadExternal",
        headers={"Authorization": f"Bearer {SLACK_BOT_TOKEN}", "Content-Type": "application/json"},
        json={
            "files": [{"id": j1["file_id"], "title": title}],
            "channel_id": channel,
        },
        timeout=15,
    )
    j3 = r3.json()
    if not j3.get("ok"):
        raise RuntimeError(f"files.completeUploadExternal ({title}): {j3.get('error')}")


def build_blocks(mensaje, envio_id=None, resultado=None):
    """
    resultado: None (pendiente, con botones) / "aceptado" / "rechazado"
    (ya decidido, sin botones, con nota de resultado).
    """
    blocks = [{"type": "section", "text": {"type": "mrkdwn", "text": mensaje[:2900]}}]
    if resultado is None:
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "✅ Cliente acepta la oferta"},
                    "style": "primary",
                    "action_id": "perfil_aceptado",
                    "value": envio_id,
                    "confirm": {
                        "title": {"type": "plain_text", "text": "Confirmar"},
                        "text": {"type": "mrkdwn", "text": "¿Confirmas que el vendedor *acepta* la oferta de este comprador?"},
                        "confirm": {"type": "plain_text", "text": "Sí, aceptar"},
                        "deny": {"type": "plain_text", "text": "Cancelar"},
                    },
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "❌ Cliente rechaza la oferta"},
                    "style": "danger",
                    "action_id": "perfil_rechazado",
                    "value": envio_id,
                    "confirm": {
                        "title": {"type": "plain_text", "text": "Confirmar"},
                        "text": {"type": "mrkdwn", "text": "¿Confirmas que el vendedor *rechaza* la oferta de este comprador?"},
                        "confirm": {"type": "plain_text", "text": "Sí, rechazar"},
                        "deny": {"type": "plain_text", "text": "Cancelar"},
                    },
                },
            ],
        })
    else:
        nota = "✅ *Marcado como ACEPTADO*" if resultado == "aceptado" else "❌ *Marcado como RECHAZADO*"
        blocks.append({"type": "context", "elements": [{"type": "mrkdwn", "text": nota}]})
    return blocks


# ---------------------------------------------------------------------------
# Contadores (Firestore, incremento atomico)
# ---------------------------------------------------------------------------

def incrementar_stat(campo):
    db.collection(STATS_COL).document(STATS_DOC).set(
        {campo: firestore.Increment(1)}, merge=True
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/enviar")
def enviar():
    if request.headers.get("X-Perfil-Key") != PERFIL_API_KEY:
        return jsonify({"ok": False, "error": "No autorizado"}), 401

    form = request.form
    captador_channel = form.get("captadorChannel", "").strip()
    captador_nombre = form.get("captadorNombre", "").strip()
    mensaje = form.get("mensaje", "").strip()

    if not captador_channel or not mensaje:
        return jsonify({"ok": False, "error": "Faltan campos obligatorios (captadorChannel/mensaje)"}), 400

    envio_id = str(uuid.uuid4())

    doc = {
        "estado": "pendiente",
        "captadorNombre": captador_nombre,
        "captadorChannel": captador_channel,
        "compradorNombre": form.get("compradorNombre", ""),
        "compradorTel": form.get("compradorTel", ""),
        "compradorEmail": form.get("compradorEmail", ""),
        "viviendaDir": form.get("viviendaDir", ""),
        "viviendaRef": form.get("viviendaRef", ""),
        "mensaje": mensaje,
        "created_at": firestore.SERVER_TIMESTAMP,
    }

    try:
        canal = resolve_channel(captador_channel)

        blocks = build_blocks(mensaje, envio_id=envio_id)
        slack_resp = slack_post_message(canal, blocks, mensaje)
        doc["slack_ts"] = slack_resp["ts"]
        doc["slack_channel"] = canal

        for key, title in [
            ("fileOferta", "📄 Oferta"),
            ("fileHonorarios", "💶 Honorarios"),
            ("fileJustificante", "🧾 Justificante"),
        ]:
            slack_upload_file(canal, request.files.get(key), title)

        db.collection(COL_ENVIOS).document(envio_id).set(doc)
        incrementar_stat("total_enviados")

        return jsonify({"ok": True, "id": envio_id})
    except Exception as e:
        log.error(f"Error en /enviar: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


def procesar_decision(action_id, envio_id, channel_id, message_ts):
    """
    Trabajo real de la pulsacion del boton (Firestore, IA Gestion, SMS/email).
    Se ejecuta en un hilo aparte porque Slack exige una respuesta al
    webhook en menos de 3 segundos, y esto puede tardar mas.
    """
    doc_ref = db.collection(COL_ENVIOS).document(envio_id)
    doc = doc_ref.get()
    if not doc.exists:
        slack_update_message(channel_id, message_ts, build_blocks("(registro no encontrado)", resultado="rechazado"), "Registro no encontrado")
        return

    datos = doc.to_dict()
    if datos.get("estado") != "pendiente":
        # Ya decidido antes (doble clic) -- no repetir contador ni notificaciones
        return

    resultado = "aceptado" if action_id == "perfil_aceptado" else "rechazado"
    doc_ref.update({"estado": resultado, "decided_at": firestore.SERVER_TIMESTAMP})
    incrementar_stat("total_aceptados" if resultado == "aceptado" else "total_rechazados")

    slack_update_message(channel_id, message_ts, build_blocks(datos["mensaje"], resultado=resultado), datos["mensaje"])

    if resultado == "aceptado":
        try:
            vendedores = obtener_propietarios_inmueble(datos.get("viviendaRef", ""))
        except Exception as e:
            log.error(f"Error consultando IA Gestión para Ref {datos.get('viviendaRef')}: {e}")
            vendedores = []

        comprador = {
            "nombre": datos.get("compradorNombre", "Comprador"),
            "telefono": datos.get("compradorTel", ""),
            "email": datos.get("compradorEmail", ""),
        }
        enviados = notificar_oferta_aceptada(comprador, vendedores)
        log.info(f"Oferta aceptada {envio_id}: notificados {enviados}")


@app.post("/slack/interactions")
def slack_interactions():
    if not verifier.is_valid_request(request.get_data(), request.headers):
        return "invalid signature", 401

    payload = json.loads(request.form.get("payload", "{}"))
    if payload.get("type") != "block_actions":
        return "", 200

    action = payload["actions"][0]
    action_id = action.get("action_id")
    envio_id = action.get("value")
    channel_id = payload["channel"]["id"]
    message_ts = payload["message"]["ts"]

    if action_id not in ("perfil_aceptado", "perfil_rechazado") or not envio_id:
        return "", 200

    # Slack exige respuesta en <3s -- el trabajo real va en segundo plano.
    threading.Thread(
        target=procesar_decision, args=(action_id, envio_id, channel_id, message_ts), daemon=True
    ).start()

    return "", 200


@app.get("/stats")
def stats():
    doc = db.collection(STATS_COL).document(STATS_DOC).get()
    data = doc.to_dict() or {}
    return jsonify({
        "total_enviados": data.get("total_enviados", 0),
        "total_aceptados": data.get("total_aceptados", 0),
        "total_rechazados": data.get("total_rechazados", 0),
    })


@app.get("/healthz")
def healthz():
    return "ok", 200
