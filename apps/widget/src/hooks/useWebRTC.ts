import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@awy/utils';
import type { WidgetService } from '../services/WidgetService';
import type { CallData } from '../types';

export interface UseWebRTCReturn {
  /** Whether currently in a call */
  isInCall: boolean;
  /** Current call state */
  callState: CallData | null;
  /** Local video stream */
  localStream: MediaStream | null;
  /** Remote video stream */
  remoteStream: MediaStream | null;
  /** Whether local video is muted */
  isVideoMuted: boolean;
  /** Whether local audio is muted */
  isAudioMuted: boolean;
  /** Start a call */
  startCall: (type: 'video' | 'voice') => Promise<void>;
  /** Accept incoming call */
  acceptCall: () => Promise<void>;
  /** Reject incoming call */
  rejectCall: () => Promise<void>;
  /** End current call */
  endCall: () => Promise<void>;
  /** Toggle video mute */
  toggleVideo: () => void;
  /** Toggle audio mute */
  toggleAudio: () => void;
}

export function useWebRTC(widgetService: WidgetService | null): UseWebRTCReturn {
  const [isInCall, setIsInCall] = useState(false);
  const [callState, setCallState] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // WebRTC peer connection
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Handle incoming calls
  useEffect(() => {
    if (!widgetService) return;

    const handleIncomingCall = (call: CallData) => {
      setCallState(call);
      setIsInCall(true);
      logger.info('Incoming call:', call);
    };

    const handleCallEnded = (call: CallData) => {
      setCallState(null);
      setIsInCall(false);
      cleanupCall();
      logger.info('Call ended:', call);
    };

    const handleError = (error: { message: string }) => {
      logger.error('WebRTC error:', error.message);
      cleanupCall();
    };

    widgetService.on('call:incoming', handleIncomingCall);
    widgetService.on('call:ended', handleCallEnded);
    widgetService.on('error', handleError);

    return () => {
      widgetService.off('call:incoming', handleIncomingCall);
      widgetService.off('call:ended', handleCallEnded);
      widgetService.off('error', handleError);
    };
  }, [widgetService]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(async () => {
    try {
      // Create peer connection with ICE servers
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // TODO: Add TURN servers from config
        ],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        setRemoteStream(stream);
        logger.debug('Remote stream received');
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && widgetService) {
          // TODO: Send ICE candidate via signaling
          logger.debug('ICE candidate generated');
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        logger.debug('Connection state changed:', state);
        
        if (state === 'connected') {
          setCallState(prev => prev ? { ...prev, status: 'connected' } : null);
        } else if (state === 'disconnected' || state === 'failed') {
          cleanupCall();
        }
      };

      return peerConnection;
    } catch (error) {
      logger.error('Failed to initialize peer connection:', error);
      throw error;
    }
  }, [widgetService]);

  // Get user media
  const getUserMedia = useCallback(async (type: 'video' | 'voice') => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      logger.debug('Local stream acquired:', { type, tracks: stream.getTracks().length });
      return stream;
    } catch (error) {
      logger.error('Failed to get user media:', error);
      throw error;
    }
  }, []);

  // Start call
  const startCall = useCallback(async (type: 'video' | 'voice') => {
    if (!widgetService) {
      throw new Error('Widget service not available');
    }

    try {
      // Get user media
      const stream = await getUserMedia(type);
      
      // Initialize peer connection
      const peerConnection = await initializePeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Start call via widget service
      await widgetService.startCall(type);

      setCallState({
        id: `call_${Date.now()}`,
        type,
        status: 'initiating',
        participants: {
          caller: 'current_user', // TODO: Use actual user ID
          callee: 'partner', // TODO: Use actual partner ID
        },
        startedAt: new Date().toISOString(),
      });

      setIsInCall(true);
      logger.info('Call started:', { type });
    } catch (error) {
      logger.error('Failed to start call:', error);
      cleanupCall();
      throw error;
    }
  }, [widgetService, getUserMedia, initializePeerConnection]);

  // Accept call
  const acceptCall = useCallback(async () => {
    if (!widgetService || !callState) {
      throw new Error('No incoming call to accept');
    }

    try {
      // Get user media
      const stream = await getUserMedia(callState.type);
      
      // Initialize peer connection
      const peerConnection = await initializePeerConnection();
      
      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // TODO: Handle offer/answer exchange via signaling
      
      setCallState(prev => prev ? { ...prev, status: 'connecting' } : null);
      logger.info('Call accepted');
    } catch (error) {
      logger.error('Failed to accept call:', error);
      cleanupCall();
      throw error;
    }
  }, [widgetService, callState, getUserMedia, initializePeerConnection]);

  // Reject call
  const rejectCall = useCallback(async () => {
    if (!widgetService || !callState) {
      throw new Error('No incoming call to reject');
    }

    try {
      // TODO: Send rejection via signaling
      
      setCallState(null);
      setIsInCall(false);
      cleanupCall();
      logger.info('Call rejected');
    } catch (error) {
      logger.error('Failed to reject call:', error);
      throw error;
    }
  }, [widgetService, callState]);

  // End call
  const endCall = useCallback(async () => {
    if (!widgetService) {
      throw new Error('Widget service not available');
    }

    try {
      // TODO: Send hangup via signaling
      
      setCallState(null);
      setIsInCall(false);
      cleanupCall();
      logger.info('Call ended');
    } catch (error) {
      logger.error('Failed to end call:', error);
      throw error;
    }
  }, [widgetService]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoMuted(!videoTracks[0]?.enabled);
      logger.debug('Video toggled:', !videoTracks[0]?.enabled ? 'muted' : 'unmuted');
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!audioTracks[0]?.enabled);
      logger.debug('Audio toggled:', !audioTracks[0]?.enabled ? 'muted' : 'unmuted');
    }
  }, []);

  // Cleanup function
  const cleanupCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear remote stream
    setRemoteStream(null);
    
    // Reset mute states
    setIsVideoMuted(false);
    setIsAudioMuted(false);

    logger.debug('Call cleanup completed');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  return {
    isInCall,
    callState,
    localStream,
    remoteStream,
    isVideoMuted,
    isAudioMuted,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}

