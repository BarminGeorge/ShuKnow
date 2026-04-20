import * as signalR from "@microsoft/signalr";
import {
  CHAT_HUB_URL,
  SIGNALR_RECONNECT_BASE_DELAY_MS,
  SIGNALR_RECONNECT_MAX_DELAY_MS,
} from "../constants";

export interface SendMessageCommand {
  content: string;
  context?: string | null;
  attachmentIds?: string[] | null;
}

export interface ProcessingStartedEvent {
  operationId: string;
}

export interface MessageChunkEvent {
  operationId: string;
  messageId: string;
  chunk: string;
}

export interface MessageCompletedEvent {
  operationId: string;
  messageId: string;
}

export interface ChatHubFileDto {
  fileId: string;
  name: string;
  description: string;
  contentType: string;
}

export interface FileMovedEvent {
  fileId: string;
  fileName: string;
  fromFolderId: string | null;
  toFolderId: string | null;
}

export interface ChatHubFolderDto {
  folderId: string;
  name: string;
  description: string;
  emoji?: string | null;
  parentFolderId?: string | null;
  sortOrder: number;
}

export interface ProcessingCompletedEvent {
  operationId: string;
}

export type ProcessingFailureCode =
  | number
  | "LlmConnectionFailed"
  | "LlmInvalidResponse"
  | "FileOperationFailed"
  | "InternalError"
  | "LLM_CONNECTION_FAILED"
  | "LLM_RATE_LIMITED"
  | "LLM_INVALID_RESPONSE"
  | "CLASSIFICATION_PARSE_ERROR"
  | "FILE_OPERATION_FAILED"
  | "INTERNAL_ERROR";

export interface ProcessingFailedEvent {
  operationId: string;
  error: string;
  code: ProcessingFailureCode;
}

export interface ProcessingCancelledEvent {
  operationId: string;
}

export interface ValidationFailedEvent {
  targetMethod: string;
  errors: ValidationErrorDto[];
}

export interface ValidationErrorDto {
  propertyName: string;
  errorMessage: string;
}

export interface TextUpdatedEvent {
  fileId: string;
  text: string;
}

export interface AttachmentSavedEvent {
  attachmentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface ChatHubEventHandlers {
  onValidationFailed?: (event: ValidationFailedEvent) => void;
  onProcessingStarted?: (event: ProcessingStartedEvent) => void;
  onMessageChunk?: (event: MessageChunkEvent) => void;
  onMessageCompleted?: (event: MessageCompletedEvent) => void;
  onFileCreated?: (file: ChatHubFileDto) => void;
  onFileMoved?: (event: FileMovedEvent) => void;
  onFolderCreated?: (folder: ChatHubFolderDto) => void;
  onTextAppended?: (event: TextUpdatedEvent) => void;
  onTextPrepended?: (event: TextUpdatedEvent) => void;
  onAttachmentSaved?: (event: AttachmentSavedEvent) => void;
  onProcessingCompleted?: (event: ProcessingCompletedEvent) => void;
  onProcessingFailed?: (event: ProcessingFailedEvent) => void;
  onProcessingCancelled?: (event: ProcessingCancelledEvent) => void;
  onConnectionStateChanged?: (state: signalR.HubConnectionState) => void;
  onReconnecting?: (error?: Error) => void;
  onReconnected?: (connectionId?: string) => void;
  onClose?: (error?: Error) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;

export class ChatHubClient {
  private connection: signalR.HubConnection | null = null;
  private handlers: ChatHubEventHandlers = {};
  private reconnectAttemptCount = 0;

  get connectionState(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  setEventHandlers(handlers: ChatHubEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(CHAT_HUB_URL, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= MAX_RECONNECT_ATTEMPTS) {
            return null;
          }
          const delay = SIGNALR_RECONNECT_BASE_DELAY_MS * Math.pow(2, retryContext.previousRetryCount);
          return Math.min(delay, SIGNALR_RECONNECT_MAX_DELAY_MS);
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.registerServerEventHandlers();
    this.registerConnectionLifecycleHandlers();

    try {
      await this.connection.start();
      this.reconnectAttemptCount = 0;
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Connected);
    } catch (connectionError) {
      throw connectionError;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
      } catch {
      }
      this.connection = null;
    }
  }

  async sendMessage(command: SendMessageCommand): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to ChatHub");
    }
    await this.connection!.invoke("SendMessage", command);
  }

  async cancelProcessing(): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to ChatHub");
    }
    await this.connection!.invoke("CancelProcessing");
  }

  private registerServerEventHandlers(): void {
    if (!this.connection) return;

    this.connection.on("OnValidationFailed", (event: ValidationFailedEvent) => {
      this.handlers.onValidationFailed?.(event);
    });

    this.connection.on("OnProcessingStarted", (event: ProcessingStartedEvent) => {
      this.handlers.onProcessingStarted?.(event);
    });

    this.connection.on("OnMessageChunk", (event: MessageChunkEvent) => {
      this.handlers.onMessageChunk?.(event);
    });

    this.connection.on("OnMessageCompleted", (event: MessageCompletedEvent) => {
      this.handlers.onMessageCompleted?.(event);
    });

    this.connection.on("OnFileCreated", (file: ChatHubFileDto) => {
      this.handlers.onFileCreated?.(file);
    });

    this.connection.on("OnFileMoved", (event: FileMovedEvent) => {
      this.handlers.onFileMoved?.(event);
    });

    this.connection.on("OnFolderCreated", (folder: ChatHubFolderDto) => {
      this.handlers.onFolderCreated?.(folder);
    });

    this.connection.on("OnTextAppended", (event: TextUpdatedEvent) => {
      this.handlers.onTextAppended?.(event);
    });

    this.connection.on("OnTextPrepended", (event: TextUpdatedEvent) => {
      this.handlers.onTextPrepended?.(event);
    });

    this.connection.on("OnAttachmentSaved", (event: AttachmentSavedEvent) => {
      this.handlers.onAttachmentSaved?.(event);
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

  private registerConnectionLifecycleHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting((error) => {
      this.reconnectAttemptCount++;
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Reconnecting);
      this.handlers.onReconnecting?.(error);
    });

    this.connection.onreconnected((connectionId) => {
      this.reconnectAttemptCount = 0;
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Connected);
      this.handlers.onReconnected?.(connectionId);
    });

    this.connection.onclose((error) => {
      this.handlers.onConnectionStateChanged?.(signalR.HubConnectionState.Disconnected);
      this.handlers.onClose?.(error);
    });
  }
}

let chatHubInstance: ChatHubClient | null = null;

export function getChatHubClient(): ChatHubClient {
  if (!chatHubInstance) {
    chatHubInstance = new ChatHubClient();
  }
  return chatHubInstance;
}

export async function resetChatHubClient(): Promise<void> {
  if (chatHubInstance) {
    await chatHubInstance.disconnect();
    chatHubInstance = null;
  }
}
