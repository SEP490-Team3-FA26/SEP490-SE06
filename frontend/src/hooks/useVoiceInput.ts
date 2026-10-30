import { useState, useRef, useEffect, useCallback } from "react";
import { prescriptionService } from "../services/sales/prescription.service";

interface UseVoiceInputParams {
  currentText: string;
  onTextChange: (newText: string) => void;
  lang?: string;
}

/**
 * Custom Hook tách biệt toàn bộ logic nhận diện giọng nói (Speech-to-Text)
 * và giao tiếp API Backend xử lý âm thanh (Whisper STT / Web Speech API)
 * ra khỏi tầng hiển thị giao diện UI ChatInput.
 */
export function useVoiceInput({
  currentText,
  onTextChange,
  lang = "vi-VN",
}: UseVoiceInputParams) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTranscribingBE, setIsTranscribingBE] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const baseTextRef = useRef<string>("");

  // Dọn dẹp tài nguyên khi component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Bỏ qua lỗi khi abort
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Hàm dừng nghe
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition đã dừng trước đó
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Media recorder đã dừng
      }
    }
    setIsListening(false);
  }, []);

  // Gửi audio blob lên Backend AI Service để bóc tách giọng nói qua Groq Whisper STT (dự phòng)
  const transcribeAudioViaBackend = async (blob: Blob) => {
    try {
      setIsTranscribingBE(true);
      const formData = new FormData();
      formData.append("audio", blob, "voice_input.webm");

      // Gọi endpoint bóc tách âm thanh siêu tốc của server
      const res = await prescriptionService.transcribeAudio(formData);
      const transcribed = res?.text || (res as any)?.transcribed_text;
      if (transcribed && transcribed.trim()) {
        const combined = baseTextRef.current
          ? `${baseTextRef.current} ${transcribed.trim()}`
          : transcribed.trim();
        onTextChange(combined);
      }
    } catch (err: any) {
      console.warn("Lỗi nhận diện âm thanh qua Backend:", err);
      setVoiceError("Không thể xử lý âm thanh từ máy chủ.");
      setTimeout(() => setVoiceError(null), 3000);
    } finally {
      setIsTranscribingBE(false);
    }
  };

  // Khởi động nhận diện giọng nói
  const startListening = async () => {
    setVoiceError(null);
    baseTextRef.current = currentText.trim();

    // 1. Kiểm tra Web Speech API trên trình duyệt
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }

          const combined = baseTextRef.current
            ? `${baseTextRef.current} ${transcript.trim()}`
            : transcript.trim();

          onTextChange(combined);
        };

        recognition.onerror = (event: any) => {
          if (event.error === "not-allowed") {
            setVoiceError("Vui lòng cấp quyền truy cập Microphone trong trình duyệt.");
          } else if (event.error !== "no-speech") {
            setVoiceError("Không nhận diện được giọng nói. Vui lòng thử lại.");
          }
          setIsListening(false);
          setTimeout(() => setVoiceError(null), 3500);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        return;
      } catch (err) {
        console.warn("Khởi tạo Web Speech thất bại, chuyển sang ghi âm Backend:", err);
      }
    }

    // 2. Dự phòng: Ghi âm qua MediaStream và gọi API Backend (Whisper STT)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError("Trình duyệt không hỗ trợ thu âm hoặc nhận diện giọng nói.");
        setTimeout(() => setVoiceError(null), 3500);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudioViaBackend(audioBlob);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch {
      setIsListening(false);
      setVoiceError("Không thể kích hoạt microphone. Vui lòng cấp quyền.");
      setTimeout(() => setVoiceError(null), 3500);
    }
  };

  // Bật/tắt trạng thái nghe
  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return {
    isListening,
    isTranscribingBE,
    voiceError,
    startListening,
    stopListening,
    toggleVoiceInput,
  };
}
