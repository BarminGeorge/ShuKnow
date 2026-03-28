/**
 * React hook for ChatHub SignalR connection
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import {
  getChatHub,
  resetChatHub,
  ChatHubClient,
  ChatHubEventHandlers,
  SendMessageCommand,
  ProcessingStartedEvent,
  MessageChunkEvent,
  ChatMessageDto,
  ClassificationResultEvent,
  ProcessingCompletedEvent,
  ProcessingFailedEvent,
  ProcessingCancelledEvent,
  FileDto,
  FileMovedEvent,
  FolderDto,
} from "../../api/chatHub";

export interface UseChatHubOptions {
  /** Auto-connect when hook mounts */
  autoConnect?: boolean;
  /** Event handlers */
  handlers?: ChatHubEventHandlers;
}

export interface UseChatHubReturn {
  /** Current connection state */
  connectionState: HubConnectionState;
  /** Whether connected */
  isConnected: boolean;
  /** Whether processing is in progress */
  isProcessing: boolean;
  /** Current operation ID (if processing) */
  operationId: string | null;
  /** Streaming AI message content */
  streamingContent: string;
  /** Last action ID (for undo) */
  lastActionId: string | null;
  /** Error message if any */
  error: string | null;
  /** Connect to hub */
  connect: () => Promise<void>;
  /** Disconnect from hub */
  disconnect: () => Promise<void>;
  /** Send message for AI processing */
  sendMessage: (command: SendMessageCommand) => Promise<void>;
  /** Cancel current processing */
  cancelProcessing: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export function useChatHub(options: UseChatHubOptions = {}): UseChatHubReturn {
  const { autoConnect = false, handlers: externalHandlers } = options;
  
  const hubRef = useRef<ChatHubClient | null>(null);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(
    HubConnectionState.Disconnected
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize hub on mount
  useEffect(() => {
    hubRef.current = getChatHub();
    
    // Set up internal handlers
    const handlers: ChatHubEventHandlers = {
      onConnectionStateChanged: (state) => {
        setConnectionState(state);
        externalHandlers?.onConnectionStateChanged?.(state);
      },
      
      onProcessingStarted: (event: ProcessingStartedEvent) => {
        setIsProcessing(true);
        setOperationId(event.operationId);
        setStreamingContent("");
        setError(null);
        externalHandlers?.onProcessingStarted?.(event);
      },
      
      onMessageChunk: (event: MessageChunkEvent) => {
        setStreamingContent((prev) => prev + event.chunk);
        externalHandlers?.onMessageChunk?.(event);
      },
      
      onMessageCompleted: (message: ChatMessageDto) => {
        setStreamingContent(message.content);
        externalHandlers?.onMessageCompleted?.(message);
      },
      
      onClassificationResult: (event: ClassificationResultEvent) => {
        externalHandlers?.onClassificationResult?.(event);
      },
      
      onFileCreated: (file: FileDto) => {
        externalHandlers?.onFileCreated?.(file);
      },
      
      onFileMoved: (event: FileMovedEvent) => {
        externalHandlers?.onFileMoved?.(event);
      },
      
      onFolderCreated: (folder: FolderDto) => {
        externalHandlers?.onFolderCreated?.(folder);
      },
      
      onProcessingCompleted: (event: ProcessingCompletedEvent) => {
        setIsProcessing(false);
        setOperationId(null);
        setLastActionId(event.actionId);
        externalHandlers?.onProcessingCompleted?.(event);
      },
      
      onProcessingFailed: (event: ProcessingFailedEvent) => {
        setIsProcessing(false);
        setOperationId(null);
        setError(event.error);
        externalHandlers?.onProcessingFailed?.(event);
      },
      
      onProcessingCancelled: (event: ProcessingCancelledEvent) => {
        setIsProcessing(false);
        setOperationId(null);
        setStreamingContent("");
        externalHandlers?.onProcessingCancelled?.(event);
      },
      
      onReconnecting: externalHandlers?.onReconnecting,
      onReconnected: externalHandlers?.onReconnected,
      onClose: externalHandlers?.onClose,
    };
    
    hubRef.current.setHandlers(handlers);
    
    // Auto-connect if requested
    if (autoConnect) {
      hubRef.current.connect().catch((err) => {
        console.error("Auto-connect failed:", err);
        setError("Failed to connect to chat");
      });
    }
    
    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - let the singleton persist
      // The hub will be cleaned up on logout via resetChatHub()
    };
  }, [autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async () => {
    try {
      setError(null);
      await hubRef.current?.connect();
    } catch (err) {
      setError("Failed to connect to chat");
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await resetChatHub();
    hubRef.current = getChatHub();
    setConnectionState(HubConnectionState.Disconnected);
    setIsProcessing(false);
    setOperationId(null);
    setStreamingContent("");
  }, []);

  const sendMessage = useCallback(async (command: SendMessageCommand) => {
    try {
      setError(null);
      await hubRef.current?.sendMessage(command);
    } catch (err) {
      setError("Failed to send message");
      throw err;
    }
  }, []);

  const cancelProcessing = useCallback(async () => {
    try {
      await hubRef.current?.cancelProcessing();
    } catch (err) {
      console.error("Failed to cancel processing:", err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    connectionState,
    isConnected: connectionState === HubConnectionState.Connected,
    isProcessing,
    operationId,
    streamingContent,
    lastActionId,
    error,
    connect,
    disconnect,
    sendMessage,
    cancelProcessing,
    clearError,
  };
}
