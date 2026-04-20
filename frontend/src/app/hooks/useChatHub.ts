import { useEffect, useRef, useCallback, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import {
  getChatHubClient,
  resetChatHubClient,
  ChatHubClient,
  ChatHubEventHandlers,
  SendMessageCommand,
  ProcessingStartedEvent,
  MessageChunkEvent,
  MessageCompletedEvent,
  ProcessingCompletedEvent,
  ProcessingFailedEvent,
  ProcessingCancelledEvent,
  ChatHubFileDto,
  FileMovedEvent,
  ChatHubFolderDto,
} from "../../api/chatHub";

export interface UseChatHubOptions {
  shouldAutoConnect?: boolean;
  handlers?: ChatHubEventHandlers;
}

export interface UseChatHubResult {
  connectionState: HubConnectionState;
  isConnected: boolean;
  isProcessing: boolean;
  currentOperationId: string | null;
  streamingContent: string;
  lastActionId: string | null;
  errorMessage: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (command: SendMessageCommand) => Promise<void>;
  cancelProcessing: () => Promise<void>;
  clearError: () => void;
}

export function useChatHub(options: UseChatHubOptions = {}): UseChatHubResult {
  const { shouldAutoConnect = false, handlers: externalHandlers } = options;
  
  const hubRef = useRef<ChatHubClient | null>(null);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(
    HubConnectionState.Disconnected
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    hubRef.current = getChatHubClient();
    
    const handlers: ChatHubEventHandlers = {
      onConnectionStateChanged: (state) => {
        setConnectionState(state);
        externalHandlers?.onConnectionStateChanged?.(state);
      },
      
      onProcessingStarted: (event: ProcessingStartedEvent) => {
        setIsProcessing(true);
        setCurrentOperationId(event.operationId);
        setStreamingContent("");
        setErrorMessage(null);
        externalHandlers?.onProcessingStarted?.(event);
      },
      
      onMessageChunk: (event: MessageChunkEvent) => {
        setStreamingContent((previous) => previous + event.chunk);
        externalHandlers?.onMessageChunk?.(event);
      },
      
      onMessageCompleted: (event: MessageCompletedEvent) => {
        externalHandlers?.onMessageCompleted?.(event);
      },
      
      onFileCreated: (file: ChatHubFileDto) => {
        externalHandlers?.onFileCreated?.(file);
      },
      
      onFileMoved: (event: FileMovedEvent) => {
        externalHandlers?.onFileMoved?.(event);
      },
      
      onFolderCreated: (folder: ChatHubFolderDto) => {
        externalHandlers?.onFolderCreated?.(folder);
      },
      
      onProcessingCompleted: (event: ProcessingCompletedEvent) => {
        setIsProcessing(false);
        setCurrentOperationId(null);
        setLastActionId(event.operationId);
        externalHandlers?.onProcessingCompleted?.(event);
      },
      
      onProcessingFailed: (event: ProcessingFailedEvent) => {
        setIsProcessing(false);
        setCurrentOperationId(null);
        setErrorMessage(event.error);
        externalHandlers?.onProcessingFailed?.(event);
      },
      
      onProcessingCancelled: (event: ProcessingCancelledEvent) => {
        setIsProcessing(false);
        setCurrentOperationId(null);
        setStreamingContent("");
        externalHandlers?.onProcessingCancelled?.(event);
      },
      
      onReconnecting: externalHandlers?.onReconnecting,
      onReconnected: externalHandlers?.onReconnected,
      onClose: externalHandlers?.onClose,
    };
    
    hubRef.current.setEventHandlers(handlers);
    
    if (shouldAutoConnect) {
      hubRef.current.connect().catch(() => {
        setErrorMessage("Failed to connect to chat");
      });
    }
    
    return () => {
    };
  }, [shouldAutoConnect]);

  const connect = useCallback(async () => {
    try {
      setErrorMessage(null);
      await hubRef.current?.connect();
    } catch (connectionError) {
      setErrorMessage("Failed to connect to chat");
      throw connectionError;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await resetChatHubClient();
    hubRef.current = getChatHubClient();
    setConnectionState(HubConnectionState.Disconnected);
    setIsProcessing(false);
    setCurrentOperationId(null);
    setStreamingContent("");
  }, []);

  const sendMessage = useCallback(async (command: SendMessageCommand) => {
    try {
      setErrorMessage(null);
      await hubRef.current?.sendMessage(command);
    } catch (sendError) {
      setErrorMessage("Failed to send message");
      throw sendError;
    }
  }, []);

  const cancelProcessing = useCallback(async () => {
    const operationId = currentOperationId;
    setIsProcessing(false);
    setCurrentOperationId(null);
    setStreamingContent("");
    if (operationId) {
      externalHandlers?.onProcessingCancelled?.({ operationId });
    }
    try {
      await hubRef.current?.cancelProcessing();
    } catch {
    }
  }, [currentOperationId, externalHandlers]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    connectionState,
    isConnected: connectionState === HubConnectionState.Connected,
    isProcessing,
    currentOperationId,
    streamingContent,
    lastActionId,
    errorMessage,
    connect,
    disconnect,
    sendMessage,
    cancelProcessing,
    clearError,
  };
}
