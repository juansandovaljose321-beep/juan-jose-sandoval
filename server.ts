import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? (Number(process.env.PORT) || 3000) : 3000;

app.use(express.json());

// Initialize Google Gen AI client with required header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System prompt for the JeyhBet AI Customer Support Assistant
const JEYHBET_SUPPORT_SYSTEM_PROMPT = `
Eres el Asistente Personal de Inteligencia Artificial Oficial de "JeyhBet" (monograma JM), la plataforma líder de apuestas de carreras de caballos en bolívares venezolanos (Bs) propiedad de Juan Sandoval.

Tu misión es atender con máxima amabilidad, respeto, empatía y conocimiento técnico a todos los jugadores y apostadores.

REGLAS DE NEGOCIO DE JEYHBET QUE DEBES CONOCER A FONDO:
1. PROPIETARIO: Juan Sandoval. WhatsApp personal de soporte: +58 4221475717. Correo: juansandovaljose321@gmail.com.
2. PAGOS Y RECARGAS (PAGO MÓVIL):
   - Banco de Venezuela (0102)
   - Cédula: V-29609466
   - Teléfono Pago Móvil: 04225826966
   - ¡NO se aceptan pagos desde Zinli, Ubala ni Uno Plata! Todo pago de estas plataformas será rechazado.
   - Todo depósito por Pago Móvil se reporta con la referencia y es verificado y acreditado por el propietario. El tiempo habitual de verificación es de unos minutos a 1 hora.
3. CABALLOS Y APUESTAS:
   - 6 Caballos oficiales: Nº 1 Rojo, Nº 2 Amarillo, Nº 3 Verde, Nº 4 Morado, Nº 5 Azul, Nº 6 Gris.
   - Apuesta mínima: 10,00 Bs. Máximo 3 caballos independientes por jugada.
   - Margen de ganancia: Si un caballo paga x1, si apuestas 10 Bs ganas 10 Bs de ganancia neta más tu apuesta de 10 Bs, recibiendo un total de 20 Bs. Si paga x2, una apuesta de 50 Bs paga 150 Bs (100 de ganancia + 50 de apuesta).
   - El dinero se debita en tiempo real al apostar. Si el caballo pierde, queda debitado. Si gana, se le acredita automáticamente a su saldo en bolívares reales (nada de saldo ficticio).
4. RETIROS:
   - Los retiros se pagan directo por Pago Móvil a la cuenta bancaria registrada por el usuario.
   - Solo se debita exactamente el monto solicitado por el jugador, ni un bolívar más ni menos.
   - El propietario Juan Sandoval revisa la solicitud y efectúa el pago móvil inmediatamente.
5. HORARIO OFICIAL (ZONA CARACAS):
   - Partidas cada media hora (ej: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 hasta las 10:00 PM).
   - A las 10:01 PM el hipódromo CIERRA AUTOMÁTICAMENTE por horario nocturno hasta las 09:00 AM del día siguiente. No hay carreras ni apuestas activas de noche.
6. PROTOCOLO DE CONFLICTO / RECLAMOS / DINERO NO ACREDITADO (MUY IMPORTANTE):
   - Si un usuario pregunta por qué no se le ha acreditado un depósito o un premio:
     Sé empático: "Entiendo su preocupación y estamos aquí para asistirlo. Cuénteme cuánto es el monto exacto que no se le ha acreditado, cuál fue el número de referencia y a qué hora realizó la operación para ayudarle a verificarlo."
   - Si el usuario muestra molestia, enojo, frustración alta o una queja grave de dinero:
     Debes calmarlo con respeto y derivarlo de inmediato con el propietario Juan Sandoval:
     "Comprendo totalmente su molestia y le aseguro que su dinero está seguro. Para brindarle una solución directa y prioritaria, lo estoy transfiriendo con nuestro propietario Juan Sandoval a su chat de WhatsApp personal (+58 4221475717) para que revise su comprobante y se lo resuelva de inmediato."
   - Si el usuario pide hablar con una persona o con el dueño:
     Ofrécele amablemente el enlace directo al WhatsApp +58 4221475717.

Mantén respuestas concisas, claras, profesionales y siempre en español venezolano formal y educado.
`;

// Helper: Intelligent Local Fallback Response Generator
function generateFallbackResponse(userMessage: string, userName?: string): { reply: string; escalate: boolean } {
  const lower = userMessage.toLowerCase();
  const nameGreeting = userName ? `Estimado(a) ${userName}, ` : '';

  // Check for anger/frustration/upset keywords
  const isAngry = lower.includes('estafa') || lower.includes('ladron') || lower.includes('robo') ||
    lower.includes('molesto') || lower.includes('arrecho') || lower.includes('maldit') ||
    lower.includes('urgente') || lower.includes('denuncia') || lower.includes('trampa');

  // Check for money not credited / withdrawal issue
  const isMoneyIssue = lower.includes('no me llega') || lower.includes('no se me a dado') ||
    lower.includes('no se me ha dado') || lower.includes('mi dinero') || lower.includes('no me acreditaron') ||
    lower.includes('recarga pendiente') || lower.includes('no cae') || lower.includes('retiro');

  if (isAngry || (isMoneyIssue && (lower.includes('mucho') || lower.includes('hora') || lower.includes('injusto')))) {
    return {
      reply: `${nameGreeting}comprendo totalmente su molestia y le aseguro que en JeyhBet cada bolívar de nuestros jugadores está 100% garantizado. Para verificar su caso de forma prioritaria y manual, lo estoy comunicando directamente con el propietario Juan Sandoval a su WhatsApp personal (+58 4221475717). Él revisará su referencia de inmediato para que su dinero quede resuelto.`,
      escalate: true,
    };
  }

  if (isMoneyIssue) {
    return {
      reply: `${nameGreeting}entiendo perfectamente su preocupación. En JeyhBet todas las recargas por Pago Móvil son verificadas manualmente por nuestro propietario para proteger su saldo, proceso que suele tomar entre unos minutos y una hora. Por favor, indíqueme: ¿Cuál es el monto exacto en Bs de su operación y los últimos dígitos de la referencia de Pago Móvil? Si prefiere atención inmediata, puede contactar al propietario directamente al WhatsApp (+58 4221475717).`,
      escalate: false,
    };
  }

  if (lower.includes('pagomovil') || lower.includes('pago movil') || lower.includes('cuenta') || lower.includes('depositar') || lower.includes('donde pago') || lower.includes('datos')) {
    return {
      reply: `${nameGreeting}los datos oficiales únicos para recargar en JeyhBet son: Banco de Venezuela (0102), Cédula: V-29609466, Teléfono: 04225826966 (a nombre del titular). Recuerde que NO aceptamos pagos desde Zinli, Ubala ni Uno Plata. Una vez realizada la transferencia, registre la referencia en el botón "Recargar" o repórtela al WhatsApp +58 4221475717.`,
      escalate: false,
    };
  }

  if (lower.includes('horario') || lower.includes('cierra') || lower.includes('noche') || lower.includes('10:01') || lower.includes('cuando abre')) {
    return {
      reply: `${nameGreeting}nuestro horario oficial de carreras es desde las 09:00 AM hasta las 10:00 PM (hora de Caracas) con carreras cada media hora (ej: 09:00, 09:30, 10:00, 10:30, 11:00, etc.). A las 10:01 PM el sistema cierra automáticamente por horario nocturno y reabre a las 09:00 AM del día siguiente. Durante la noche las taquillas permanecen cerradas.`,
      escalate: false,
    };
  }

  if (lower.includes('ganancia') || lower.includes('multiplicador') || lower.includes('como ganar') || lower.includes('cuanto gano')) {
    return {
      reply: `${nameGreeting}el cálculo de ganancias en JeyhBet es muy sencillo: si juegas a un caballo con cuota x1 y apuestas 10 Bs, recibes 10 Bs de ganancia más tu apuesta de 10 Bs (total 20 Bs). Si juegas 50 Bs a cuota x2, ganas 100 Bs de ganancia más tu apuesta de 50 Bs (total 150 Bs). Cada 5 carreras los multiplicadores se actualizan dinámicamente.`,
      escalate: false,
    };
  }

  if (lower.includes('retirar') || lower.includes('cobrar') || lower.includes('mi ganancia')) {
    return {
      reply: `${nameGreeting}para retirar sus ganancias, vaya al botón "Retirar" en la parte superior o en su perfil, elija su cuenta de Pago Móvil registrada e ingrese el monto. Se le debitará únicamente el monto exacto que solicitó retirar (ni un bolívar más ni menos) y el propietario le transferirá a su Pago Móvil.`,
      escalate: false,
    };
  }

  if (lower.includes('hola') || lower.includes('buenas') || lower.includes('buenos dias') || lower.includes('buenas tardes')) {
    return {
      reply: `¡Hola ${userName ? userName : 'amigo apostador'}! Bienvenido al Soporte Oficial de JeyhBet. Soy el Asistente de IA de la plataforma. ¿En qué puedo orientarle hoy sobre sus apuestas, recargas por Pago Móvil, retiros o el hipódromo en vivo?`,
      escalate: false,
    };
  }

  return {
    reply: `${nameGreeting}estoy a su completa disposición para cualquier duda sobre JeyhBet: recargas de saldo por Pago Móvil, cómo apostar a los 6 caballos (Rojo, Amarillo, Verde, Morado, Azul, Gris), cómo cobrar sus retiros o información sobre los horarios oficiales de Caracas. ¿Desea consultar algo específico o prefiere comunicarse con el propietario Juan Sandoval al WhatsApp (+58 4221475717)?`,
    escalate: false,
  };
}

// Support AI Endpoint
app.post('/api/support/chat', async (req, res) => {
  try {
    const { messages, userProfile } = req.body;
    const latestUserMessage = Array.isArray(messages) && messages.length > 0
      ? messages[messages.length - 1].content || ''
      : '';

    // If Gemini API Key is available, use gemini-3.8-flash for intelligent response
    if (apiKey) {
      try {
        const contents = [];
        
        // System context as first message
        contents.push({
          role: 'user',
          parts: [{ text: JEYHBET_SUPPORT_SYSTEM_PROMPT }],
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'Entendido. Soy el asistente de IA oficial de JeyhBet y seguiré todas las reglas operativas, de respeto y de escalamiento a Juan Sandoval estrictamente.' }],
        });

        // Add user context
        if (userProfile) {
          contents.push({
            role: 'user',
            parts: [{ text: `[Contexto del Jugador: Nombre: ${userProfile.name}, Cédula: ${userProfile.cedula || 'N/A'}, Teléfono: ${userProfile.phone || 'N/A'}, Saldo actual: ${userProfile.balance || 0} Bs]` }],
          });
          contents.push({
            role: 'model',
            parts: [{ text: `Tengo presente los datos del jugador ${userProfile.name}. Responderé de forma personalizada.` }],
          });
        }

        // Add conversation history
        for (const msg of (messages || [])) {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contents,
        });

        const replyText = aiResponse.text || '';

        // Check if escalation is appropriate based on user's query or reply
        const lowerQuery = latestUserMessage.toLowerCase();
        const lowerReply = replyText.toLowerCase();
        const escalate = lowerQuery.includes('estafa') || lowerQuery.includes('ladron') ||
          lowerQuery.includes('molesto') || lowerQuery.includes('no me pagan') ||
          lowerReply.includes('whatsapp') || lowerReply.includes('+58 4221475717');

        const encodedMsg = encodeURIComponent(
          `Hola Juan Sandoval, soy ${userProfile?.name || 'un jugador de JeyhBet'} (C.I: ${userProfile?.cedula || 'N/A'}). El Asistente IA me transfirió para asistencia directa. Mi consulta: "${latestUserMessage}"`
        );
        const whatsappUrl = `https://wa.me/584221475717?text=${encodedMsg}`;

        return res.json({
          reply: replyText,
          escalateToWhatsApp: escalate,
          whatsappUrl,
        });
      } catch (geminiError) {
        console.warn('Gemini API call returned error, using intelligent domain fallback:', geminiError);
        // Fallback gracefully
        const fallback = generateFallbackResponse(latestUserMessage, userProfile?.name);
        const encodedMsg = encodeURIComponent(
          `Hola Juan Sandoval, soy ${userProfile?.name || 'un usuario de JeyhBet'}. El Asistente IA me remitió para atención con mi caso: "${latestUserMessage}"`
        );
        return res.json({
          reply: fallback.reply,
          escalateToWhatsApp: fallback.escalate,
          whatsappUrl: `https://wa.me/584221475717?text=${encodedMsg}`,
        });
      }
    } else {
      // Fallback if no API key is attached
      const fallback = generateFallbackResponse(latestUserMessage, userProfile?.name);
      const encodedMsg = encodeURIComponent(
        `Hola Juan Sandoval, soy ${userProfile?.name || 'un usuario de JeyhBet'}. Me comunico sobre mi cuenta: "${latestUserMessage}"`
      );
      return res.json({
        reply: fallback.reply,
        escalateToWhatsApp: fallback.escalate,
        whatsappUrl: `https://wa.me/584221475717?text=${encodedMsg}`,
      });
    }
  } catch (error) {
    console.error('Support chat error:', error);
    return res.status(500).json({
      error: 'Error en el servicio de soporte',
      reply: 'Disculpe la molestia temporal. Puede comunicarse directamente con el propietario Juan Sandoval al WhatsApp +58 4221475717.',
      escalateToWhatsApp: true,
      whatsappUrl: 'https://wa.me/584221475717',
    });
  }
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  // Cloud Run / container health check endpoint
  app.get(['/healthz', '/api/health'], (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Googlebot SEO endpoints with explicit content types
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.resolve(process.cwd(), 'public', 'robots.txt'));
  });

  app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.resolve(process.cwd(), 'public', 'sitemap.xml'));
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JeyhBet server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
