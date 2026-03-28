/**
 * SignalR ChatHub client service
 * Handles real-time communication for AI-powered file classification
 */

import * as signalR from "@microsoft/signalr";
import { getAuthToken } from "./client";

// ── Hub URL ────────────────────────────────────

const CHAT_HUB_URL = "/hubs/chat";

// ── Types from asyncapi.yaml ───────────────────

/** Client → Server: Send message for AI processing */
export interface SendMessageCommand {
  content: string;
  context?: string | null;
  attachmentIds?: string[] | null;
}

/** Server → Client: Processing started */
export interface ProcessingStartedEvent {
  operationId: string;
}

/** Server → Client: Streaming LLM token chunk */
export interface MessageChunkEvent {
  operationId: string;
  messageId: string;
  chunk: string;
}

/** Server → Client: Complete AI message */
export interface ChatMessageDto {
  id: string;
  role: "User" | "Ai";
  content: string;
  attachments?: AttachmentDto[] | null;
}

export interface AttachmentDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

/** Server → Client: Classification plan */
export interface ClassificationResultEvent {
  operationId: string;
  decisions: ClassificationDecisionDto[];
}

export interface ClassificationDecisionDto {
  fileName: string;
  targetFolderName: string;
  targetFolderId?: string | null;
  isNewFolder: boolean;
}

/** Server → Client: File created */
export interface FileDto {
  id: string;
  folderId: string;
  folderName: string;
  name: string;
  description?: string;
  contentType: string;
  sizeBytes: number;
}

/** Server → Client: File moved */
export interface FileMovedEvent {
  fileId: string;
  fromFolderId: string;
  toFolderId: string;
}

/** Server → Client: Folder created */
export interface FolderDto {
  id: string;
  name: string;
  description?: string;
  parentFolderId?: string | null;
  sortOrder: number;
  fileCount: number;
  hasChildren: boolean;
  path?: string[] | null;
}

/** Server → Client: Processing completed */
export interface ProcessingCompletedEvent {
  operationId: string;
  actionId: string;
  summary: string;
  filesCreated: number;
  filesMoved: number;
}

/** Server → Client: Processing failed */
export interface ProcessingFailedEvent {
  operationId: string;
  error: string;
  code:
    | "LLM_CONNECTION_FAILED"
    | "LLM_RATE_LIMITED"
    | "LLM_INVALID_RESPONSE"
    | "CLASSIFICATION_PARSE_ERROR"
    | "FILE_OPERATION_FAILED"
    | "INTERNAL_ERROR";
}

/** Server → Client: Processing cancelled */
export interface ProcessingCancelledEvent {
  operationId: string;
}

// ── Event handlers type ────────────────────────

export interface ChatHubEventHandlers {
  onProcessingStarted?: (event: ProcessingStartedEvent) => void;
  onMessageChunk?: (event: MessageChunkEvent) => void;
  onMessageCompleted?: (message: ChatMessageDto) => void;
  onClassificationResult?: (event: ClassificationResultEvent) => void;
  onFileCreated?: (file: FileDto) => void;
  onFileMoved?: (event: FileMovedEvent) => void;
  onFolderCreated?: (folder: FolderDto) => void;
  onProcessingCompleted?: (event: ProcessingCompletedEvent) => void;
  onProcessingFailed?: (event: ProcessingFailedEvent) => void;
  onProcessingCancelled?: (event: ProcessingCancelledEvent) => void;
  onConnectionStateChanged?: (state: signalR.HubConnectionState) => void;
  onReconnecting?: (error?: Error) => void;
  onReconnected?: (connectionId?: string) => void;
  onClose?: (error?: Error) => void;
}

// ── ChatHub Client ─────────────────────────────

export class ChatHubClient {
  private connection: signalR.HubConnection | null = null;
  private handlers: ChatHubEventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Get current connection state
   */
  get state(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: ChatHubEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  /**
   * Connect to the ChatHub
   */
  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = getAuthToken();

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(CHAT_HUB_URL, {
        accessTokenFactory: () => token || "",
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0, 2s, 4s, 8s, 16s, then stop
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null;
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 16000);
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerServerHandlers();
    this.registerConnectionHandlers();

    try {
      await this.connection.start();
      this.reconnectAttempts = 0;
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Connected);
    } catch (error) {
      console.error("Failed to connect to ChatHub:", error);
      throw error;
    }
  }

  /**
   * Disconnect from the ChatHub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch (error) {
        console.error("Error disconnecting from ChatHub:", error);
      }
      this.connection = null;
    }
  }

  /**
   * Send a message for AI processing
   */
  async sendMessage(command: SendMessageCommand): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to ChatHub");
    }
    await this.connection!.invoke("SendMessage", command);
  }

  /**
   * Cancel the current AI processing operation
   */
  async cancelProcessing(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to ChatHub");
    }
    await this.connection!.invoke("CancelProcessing");
  }

  /**
   * Register handlers for server-to-client events
   */
  private registerServerHandlers(): void {
    if (!this.connection) return;

    this.connection.on("OnProcessingStarted", (event: ProcessingStartedEvent) => {
      this.handlers.onProcessingStarted?.(event);
    });

    this.connection.on("OnMessageChunk", (event: MessageChunkEvent) => {
      this.handlers.onMessageChunk?.(event);
    });

    this.connection.on("OnMessageCompleted", (message: ChatMessageDto) => {
      this.handlers.onMessageCompleted?.(message);
    });

    this.connection.on("OnClassificationResult", (event: ClassificationResultEvent) => {
      this.handlers.onClassificationResult?.(event);
    });

    this.connection.on("OnFileCreated", (file: FileDto) => {
      this.handlers.onFileCreated?.(file);
    });

    this.connection.on("OnFileMoved", (event: FileMovedEvent) => {
      this.handlers.onFileMoved?.(event);
    });

    this.connection.on("OnFolderCreated", (folder: FolderDto) => {
      this.handlers.onFolderCreated?.(folder);
    });

    this.connection.on("OnProcessingCompleted", (event: ProcessingCompletedEvent) => {
      this.handlers.onProcessingCompleted?.(event);
    });

    this.connection.on("OnProcessingFailed", (event: ProcessingFailedEvent) => {
      this.handlers.onProcessingFailed?.(event);
    });

    this.connection.on("OnProcessingCancelled", (event: ProcessingCancelledEvent) => {
      this.handlers.onProcessingCancelled?.(event);
    });
  }

  /**
   * Register handlers for connection lifecycle events
   */
  private registerConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting((error) => {
      this.reconnectAttempts++;
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Reconnecting);
      this.handlers.onReconnecting?.(error);
    });

    this.connection.onreconnected((connectionId) => {
      this.reconnectAttempts = 0;
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Connected);
      this.handlers.onReconnected?.(connectionId);
    });

    this.connection.onclose((error) => {
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Disconnected);
      this.handlers.onClose?.(error);
    });
  }
}

// ── Singleton instance ─────────────────────────

let chatHubInstance: ChatHubClient | null = null;

/**
 * Get the singleton ChatHub client instance
 */
export function getChatHub(): ChatHubClient {
  if (!chatHubInstance) {
    chatHubInstance = new ChatHubClient();
  }
  return chatHubInstance;
}

/**
 * Reset the ChatHub client (for logout/cleanup)
 */
export async function resetChatHub(): Promise<void> {
  if (chatHubInstance) {
    await chatHubInstance.disconnect();
    chatHubInstance = null;
  }
}
