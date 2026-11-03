const fs = require('fs');
const path = require('path');

// Sinh file WAV PCM 16-bit Mono 44.1kHz
const sampleRate = 44100;
const durationSec = 15;
const totalSamples = sampleRate * durationSec;
const buffer = Buffer.alloc(44 + totalSamples * 2);

// WAV Header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + totalSamples * 2, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
buffer.writeUInt32LE(sampleRate, 24); // SampleRate
buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
buffer.writeUInt16LE(2, 32);  // BlockAlign
buffer.writeUInt16LE(16, 34); // BitsPerSample
buffer.write('data', 36);
buffer.writeUInt32LE(totalSamples * 2, 40);

// Nốt nhạc giai điệu chuông báo thức nhẹ nhàng (E5, G#5, B5, E6)
const phraseDuration = 2.5; // mỗi cụm chuông kéo dài 2.5s, lặp lại 6 lần trong 15s
const notes = [
  { freq: 659.25, time: 0.0, dur: 0.8 }, // E5
  { freq: 830.61, time: 0.35, dur: 0.8 }, // G#5
  { freq: 987.77, time: 0.70, dur: 0.8 }, // B5
  { freq: 1318.51, time: 1.05, dur: 1.4 }, // E6
];

for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate;
  const loopT = t % phraseDuration;

  let sample = 0;
  for (const n of notes) {
    if (loopT >= n.time && loopT < n.time + n.dur) {
      const noteT = loopT - n.time;
      // Exponential decay envelope
      const env = Math.exp(-noteT * 3.5);
      // Soft chime tone (căn bản + hài âm 2 và 3)
      const tone = 0.7 * Math.sin(2 * Math.PI * n.freq * noteT)
                 + 0.25 * Math.sin(4 * Math.PI * n.freq * noteT)
                 + 0.05 * Math.sin(6 * Math.PI * n.freq * noteT);
      sample += tone * env;
    }
  }

  // Master volume và fade out nhẹ 0.5s cuối file
  const fadeOut = t > durationSec - 0.5 ? (durationSec - t) / 0.5 : 1.0;
  const masterVal = Math.max(-1, Math.min(1, sample * 0.6 * fadeOut));
  const int16 = Math.floor(masterVal * 32767);
  buffer.writeInt16LE(int16, 44 + i * 2);
}

const outputPath = path.resolve(__dirname, '../assets/alarm_gentle.wav');
fs.writeFileSync(outputPath, buffer);
console.log(`Đã tạo thành công file âm thanh: ${outputPath} (${buffer.length} bytes)`);
