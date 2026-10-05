import { useState, useEffect, useCallback, useRef } from 'react';
import {
  aiClinicalService,
  ConsultationAudioRecordItem,
  ConsultationQuery,
} from '../services/ai/aiClinical.service';

export function useVoiceConsultationHistory(initialBranch: string = 'BR-001') {
  const [consultations, setConsultations] = useState<ConsultationAudioRecordItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Active audio player state
  const [activeRecord, setActiveRecord] = useState<ConsultationAudioRecordItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query: ConsultationQuery = {
        branchId: selectedBranch === 'ALL' ? undefined : selectedBranch,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchKeyword.trim() || undefined,
        page: currentPage,
        limit: 20,
      };

      const res = await aiClinicalService.getConsultations(query);
      if (res?.success) {
        setConsultations(res.data || []);
        setTotal(res.pagination?.total || 0);
      } else {
        setConsultations([]);
        setTotal(0);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load consultation records';
      setError(msg);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedStatus, searchKeyword, currentPage]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Hulpfunctie om het juiste afspeel-URL voor het audiobestand te bepalen
  const getAudioPlaybackUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

  const speechTimerRef = useRef<any>(null);

  // Fallback met behulp van Web Speech API wanneer het audiobestand niet kan worden geladen
  const playSpeechSynthesisFallback = (text: string, estimatedDuration: number = 12) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsPlaying(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text || 'Bản ghi âm cuộc thoại tư vấn');
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.includes('vi') || v.lang.includes('VI'));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      setDuration(estimatedDuration);
      setCurrentTime(0);

      const startTime = Date.now();
      if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      speechTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setCurrentTime(Math.min(elapsed, estimatedDuration));
      }, 250);

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (speechTimerRef.current) clearInterval(speechTimerRef.current);
      };

      window.speechSynthesis.speak(utterance);
    } catch (synthErr) {
      console.warn('SpeechSynthesis mislukt:', synthErr);
      setIsPlaying(false);
    }
  };

  // Behandelt het afspelen en pauzeren van audioconsultaties
  const playAudio = (record: ConsultationAudioRecordItem) => {
    // Pauzeren of hervatten indien het huidige actieve record wordt aangeklikt
    if (activeRecord?.consultationId === record.consultationId) {
      if (isPlaying) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.pause();
        }
        if (speechTimerRef.current) clearInterval(speechTimerRef.current);
        setIsPlaying(false);
      } else {
        if (audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
            playSpeechSynthesisFallback(record.transcription, record.audioDuration || 12);
          });
        } else if (typeof window !== 'undefined' && window.speechSynthesis?.paused) {
          window.speechSynthesis.resume();
          setIsPlaying(true);
        } else {
          playSpeechSynthesisFallback(record.transcription, record.audioDuration || 12);
        }
      }
      return;
    }

    // Stop eventueel vorig afspelend geluid
    stopAudio();
    setActiveRecord(record);

    const playbackUrl = getAudioPlaybackUrl(record.audioUrl);

    // Indien er geen geldig audio-URL is, direct overschakelen naar de spraaksynthese-fallback
    if (!playbackUrl) {
      playSpeechSynthesisFallback(record.transcription, record.audioDuration || 12);
      return;
    }

    try {
      const audio = new Audio(playbackUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration || record.audioDuration || 15);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      // Foutafhandeling: val terug op spraaksynthese bij ontbrekende of beschadigde audiobestanden
      audio.onerror = (e) => {
        console.warn('Fout bij afspelen audiobestand, overschakelen naar spraaksynthese:', e);
        playSpeechSynthesisFallback(record.transcription, record.audioDuration || 12);
      };

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((playErr) => {
          console.warn('audio.play() mislukt, spraaksynthese activeren:', playErr);
          playSpeechSynthesisFallback(record.transcription, record.audioDuration || 12);
        });
    } catch (err) {
      console.warn('Kon Audio niet initialiseren:', err);
      playSpeechSynthesisFallback(record.transcription, record.audioDuration || 12);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seekAudio = (timeInSeconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeInSeconds;
      setCurrentTime(timeInSeconds);
    }
  };

  // Opruimen van audio-elementen en timers bij demontage van de component
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Confirm pharmacist decision
  const confirmDecision = async (
    consultationId: string,
    decision: {
      selectedDrugs: any[];
      clinicalNotes?: string;
    },
    agreement: boolean,
    pharmacistInfo?: any,
    auditCode?: string,
    orderCode?: number
  ) => {
    try {
      setSubmitting(true);
      setError(null);
      const generatedAuditCode = auditCode || `GPP-AI-${Math.floor(100000 + Math.random() * 900000)}`;

      await aiClinicalService.confirmConsultation(consultationId, {
        pharmacistFinalDecision: decision,
        pharmacistAgreement: agreement,
        pharmacistInfo,
        auditCode: generatedAuditCode,
        orderCode,
      });

      setTimeout(() => {
        fetchConsultations();
      }, 1000);

      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to confirm decision';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    consultations,
    total,
    loading,
    submitting,
    error,
    selectedBranch,
    setSelectedBranch,
    selectedStatus,
    setSelectedStatus,
    searchKeyword,
    setSearchKeyword,
    currentPage,
    setCurrentPage,
    activeRecord,
    setActiveRecord,
    isPlaying,
    currentTime,
    duration,
    playAudio,
    stopAudio,
    seekAudio,
    refetch: fetchConsultations,
    confirmDecision,
  };
}
