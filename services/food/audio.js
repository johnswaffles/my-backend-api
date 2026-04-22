import { GoogleGenAI } from '@google/genai';

function createWavHeader({ dataLength, sampleRate, channels = 1, bitsPerSample = 16 }) {
  const bytesPerSample = bitsPerSample / 8;
  const byteRate = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function pcmBase64ToWavBase64(pcmBase64, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const pcmBuffer = Buffer.isBuffer(pcmBase64)
    ? pcmBase64
    : Buffer.from(String(pcmBase64 || ''), 'base64');
  const wavHeader = createWavHeader({
    dataLength: pcmBuffer.length,
    sampleRate,
    channels,
    bitsPerSample
  });

  return Buffer.concat([wavHeader, pcmBuffer]).toString('base64');
}

function buildSpeechPrompt(text) {
  return typeof text === 'string' ? text.trim() : '';
}

export async function generateFoodSpeech({ apiKey, model, voice = 'Orus', text }) {
  const spokenText = buildSpeechPrompt(text);
  if (!spokenText) {
    return { audioBase64: '', mimeType: 'audio/wav', fallback: true, text: spokenText };
  }

  if (!apiKey) {
    return { audioBase64: '', mimeType: 'audio/wav', fallback: true, text: spokenText };
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: spokenText,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      }
    }
  });

  const audioBase64 = response.data || '';
  if (!audioBase64) {
    return { audioBase64: '', mimeType: 'audio/wav', fallback: true, text: spokenText };
  }

  return {
    audioBase64: pcmBase64ToWavBase64(audioBase64, 24000, 1, 16),
    mimeType: 'audio/wav',
    fallback: false,
    text: spokenText
  };
}
