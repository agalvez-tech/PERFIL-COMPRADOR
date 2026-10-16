// Función serverless de Vercel: extrae los datos de la propuesta firmada con
// Claude usando la key de Anthropic guardada en Vercel (Project Settings →
// Environment Variables → ANTHROPIC_API_KEY). La key nunca llega al navegador.
//
// El navegador envía JSON: { filename, mediaType, data } con el fichero en base64.
import mammoth from 'mammoth';

const EXTRACTION_PROMPT = `Eres un asistente que extrae información de documentos de propuesta de compra inmobiliaria.
Analiza el documento y extrae ÚNICAMENTE estos datos en formato JSON puro (sin markdown, sin texto extra):
{"compradorNombre":"nombre completo del comprador","compradorNif":"NIF o DNI","compradorTel":"teléfono si aparece","viviendaDir":"dirección completa del inmueble","viviendaRef":"referencia comercial","precioOferta":"precio en números sin símbolo euro ni puntos de miles"}
Si algún dato no aparece devuelve null para ese campo. No inventes datos.`;

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function getApiKey() {
  // Acepta también el nombre con prefijo VITE_ por si se creó así en Vercel.
  return (process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '').trim();
}

async function buildDocumentBlock(filename, mediaType, data) {
  const ext = (filename || '').split('.').pop().toLowerCase();

  if (IMAGE_TYPES.includes(mediaType)) {
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
  }
  if (mediaType === 'application/pdf' || ext === 'pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  if (mediaType === DOCX_TYPE || ext === 'docx') {
    // La API de Anthropic no acepta Word: sacamos el texto y lo enviamos como documento de texto.
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(data, 'base64') });
    return { type: 'document', source: { type: 'text', media_type: 'text/plain', data: value } };
  }
  if (ext === 'doc') {
    throw new Error('El formato .doc antiguo no se puede leer. Guárdalo como PDF o .docx.');
  }
  throw new Error(`Formato no soportado (${mediaType || ext}). Usa PDF, Word (.docx) o una foto.`);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Falta ANTHROPIC_API_KEY en Vercel' });
  }

  const { filename, mediaType, data } = req.body || {};
  if (!data) {
    return res.status(400).json({ ok: false, error: 'Falta el fichero' });
  }

  try {
    const docBlock = await buildDocumentBlock(filename, mediaType, data);

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [docBlock, { type: 'text', text: EXTRACTION_PROMPT }] }],
      }),
    });

    const result = await r.json();
    if (!r.ok) throw new Error(result.error?.message || `Error API Anthropic (${r.status})`);

    const texto = result.content?.find(b => b.type === 'text')?.text || '';
    const datos = JSON.parse(texto.replace(/```json|```/g, '').trim());
    return res.status(200).json({ ok: true, datos });
  } catch (err) {
    console.error('Error en /api/extraer:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
