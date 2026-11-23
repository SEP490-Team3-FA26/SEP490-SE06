import { useState, useRef, useEffect, useCallback } from "react";
import { prescriptionService } from "../services/sales/prescription.service";

interface UseVoiceInputParams {
  currentText: string;
  onTextChange: (newText: string) => void;
  lang?: string;
  onTranscribeComplete?: (finalText: string) => void;
}

/**
 * Custom Hook nhận diện giọng nói tiếng Việt chuẩn Hybrid:
 * 1. Chạy Web Speech API (Google Speech API) để hiển thị chữ thời gian thực (nếu trình duyệt hỗ trợ như Chrome/Edge).
 * 2. Luôn thu âm song song qua MediaRecorder và tự động Fallback gửi lên Backend AI (Groq Whisper Large V3)
 *    khi chạy trên Brave, Firefox, Safari hoặc khi Web Speech bị chặn kết nối mạng.
 */
export function useVoiceInput({
  currentText,
  onTextChange,
  lang = "vi-VN",
  onTranscribeComplete,
}: UseVoiceInputParams) {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isTranscribingBE, setIsTranscribingBE] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const baseTextRef = useRef<string>("");
  const hasWebSpeechResultRef = useRef<boolean>(false);

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

  // Gửi audio blob lên Backend AI Service để bóc tách giọng nói qua Groq Whisper STT
  const transcribeAudioViaBackend = async (blob: Blob) => {
    try {
      setIsTranscribingBE(true);
      const formData = new FormData();
      formData.append("audio", blob, "voice_input.webm");

      // Gọi endpoint bóc tách âm thanh siêu tốc của server (Whisper Large V3)
      const res = await prescriptionService.transcribeAudio(formData);
      const transcribed = res?.text || (res as any)?.transcribed_text;
      if (transcribed && transcribed.trim()) {
        const combined = baseTextRef.current
          ? `${baseTextRef.current} ${transcribed.trim()}`
          : transcribed.trim();
        onTextChange(combined);
        if (onTranscribeComplete) {
          onTranscribeComplete(combined);
        }
      } else {
        setVoiceError("Không nhận diện được giọng nói. Vui lòng nói to và thử lại.");
        setTimeout(() => setVoiceError(null), 3500);
      }
    } catch (err: any) {
      console.warn("Lỗi nhận diện âm thanh qua Backend Whisper:", err);
      setVoiceError("Không thể xử lý âm thanh từ máy chủ AI.");
      setTimeout(() => setVoiceError(null), 3500);
    } finally {
      setIsTranscribingBE(false);
    }
  };

  // Hàm dừng nghe và chuyển đổi âm thanh
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition đã dừng trước đó
      }
      recognitionRef.current = null;
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

  // Khởi động nhận diện giọng nói Hybrid
  const startListening = async () => {
    setVoiceError(null);
    baseTextRef.current = currentText.trim();
    hasWebSpeechResultRef.current = false;
    audioChunksRef.current = [];

    // 1. Kiểm tra trình duyệt có hỗ trợ thu âm qua MediaDevices không
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError("Trình duyệt không hỗ trợ microphone hoặc ghi âm.");
      setTimeout(() => setVoiceError(null), 3500);
      return;
    }

    // 2. Yêu cầu quyền truy cập Microphone và tạo MediaStream
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (permErr: any) {
      console.warn("[VoiceInput] Quyền microphone bị từ chối hoặc không có mic:", permErr);
      setVoiceError("Vui lòng cấp quyền truy cập Microphone trong trình duyệt.");
      setIsListening(false);
      setTimeout(() => setVoiceError(null), 3500);
      return;
    }

    // 3. Khởi tạo MediaRecorder để luôn lưu trữ âm thanh cho tầng Whisper AI Backend
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Tắt micro ngay khi ghi âm xong
        stream.getTracks().forEach((track) => track.stop());

        // Nếu Web Speech API không bóc tách được chữ (trường hợp dùng Brave, Firefox, hoặc lỗi mạng),
        // tự động gửi âm thanh lên Backend Groq Whisper AI để bóc tách
        if (!hasWebSpeechResultRef.current && audioChunksRef.current.length > 0) {
          const recordedBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType || "audio/webm",
          });
          // Nếu dung lượng âm thanh > 500 bytes (có tiếng nói), gửi lên Whisper STT
          if (recordedBlob.size > 500) {
            await transcribeAudioViaBackend(recordedBlob);
          } else {
            setVoiceError("Không nhận diện được giọng nói. Vui lòng nói to và thử lại.");
            setTimeout(() => setVoiceError(null), 3500);
          }
        }
      };

      // Bắt đầu ghi âm chunk mỗi 200ms
      mediaRecorder.start(200);
      setIsListening(true);
    } catch (recErr) {
      console.warn("[VoiceInput] Lỗi khởi tạo MediaRecorder:", recErr);
      stream.getTracks().forEach((t) => t.stop());
      setVoiceError("Không thể kích hoạt thiết bị thu âm.");
      setIsListening(false);
      return;
    }

    // 4. Đồng thời kích hoạt Web Speech API (nếu có) để tạo hiệu ứng chữ chạy thời gian thực trên Chrome/Edge
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = lang;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }

          if (transcript.trim()) {
            hasWebSpeechResultRef.current = true;
            const combined = baseTextRef.current
              ? `${baseTextRef.current} ${transcript.trim()}`
              : transcript.trim();
            onTextChange(combined);
          }
        };

        recognition.onerror = (event: any) => {
          // Khi chạy trên Brave hoặc mạng lỗi, Web Speech API sẽ ném lỗi network / service-not-allowed.
          // Tuyệt đối không hủy ngang hay báo lỗi đỏ ở đây vì MediaRecorder vẫn đang thu âm phía dưới!
          console.warn(
            "[VoiceInput] Web Speech API không khả dụng trên trình duyệt này (sẽ tự động dùng Whisper AI khi bấm dừng):",
            event.error
          );
        };

        recognition.onend = () => {
          // Web speech có thể tự dừng sau khoảng lặng, không tắt isListening của MediaRecorder
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (speechErr) {
        console.warn("[VoiceInput] Web Speech không hỗ trợ, dùng cơ chế ghi âm Whisper thuần túy:", speechErr);
      }
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
