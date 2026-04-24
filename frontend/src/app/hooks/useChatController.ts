import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { chatService } from "../../api";
import {
  type Attachment,
  type FileResult,
  type Message,
  applyServerIds,
} from "../components/ChatMessages";
import { useChat } from "./useChat";
import { useChatHub } from "./useChatHub";
import type {
  ChatHubFileDto,
  ChatHubFolderDto,
  MessageCompletedEvent,
  MessageChunkEvent,
  ProcessingCompletedEvent,
  ProcessingFailedEvent,
} from "../../api/chatHub";

const CHAT_TITLES = [
  "Сохраним что-нибудь?",
  "ShuKnow?",
  "Посохраняемся?",
  "Что хотите сохранить сегодня?",
  "Опять ты..",
  "Снова что-то нашёл?",
  "Есть что сохранить?",
  "Готов сохранить что-нибудь?",
  "42?",
];

interface ChatOperation {
  messageId: string;
  createdFiles: FileResult[];
  shouldRefreshFolders: boolean;
}

interface UseChatControllerOptions {
  isMockMode: boolean;
  isChatView: boolean;
  loadFolders: () => Promise<void>;
  getFolderPathById?: (folderId: string) => string | null;
}

export function useChatController({
  isMockMode,
  isChatView,
  loadFolders,
  getFolderPathById,
}: UseChatControllerOptions) {
  const { messages, setMessages, currentTitle, setCurrentTitle } = useChat();
  const operationsRef = useRef(new Map<string, ChatOperation>());
  const latestOperationIdRef = useRef<string | null>(null);
  const backendMessageOperationIdsRef = useRef(new Map<string, string>());
  const sessionIdRef = useRef<string | null>(null);

  const extractOperationIdFromEvent = (event: unknown) => {
    if (event && typeof event === "object" && "operationId" in event) {
      const operationId = (event as { operationId?: unknown }).operationId;
      if (typeof operationId === "string") {
        return operationId;
      }
    }

    return undefined;
  };

  const getOperationIdFromEvent = (event: unknown) => {
    const operationId = extractOperationIdFromEvent(event);
    if (operationId) {
      return operationId;
    }

    return latestOperationIdRef.current;
  };

  const updateAgentMessage = (
    operationId: string | null,
    updateMessage: (message: Message) => Message
  ) => {
    if (!operationId) return;

    const operation = operationsRef.current.get(operationId);
    if (!operation) return;

    setMessages((prev) =>
      prev.map((message) =>
        message.id === operation.messageId ? updateMessage(message) : message
      )
    );
  };

  const markFoldersForRefresh = (operationId: string | null) => {
    if (!operationId) return;

    const operation = operationsRef.current.get(operationId);
    if (operation) {
      operation.shouldRefreshFolders = true;
    }
  };

  const completeOperation = async (operationId: string | null) => {
    if (!operationId) return;

    const operation = operationsRef.current.get(operationId);
    if (!operation) return;

    operationsRef.current.delete(operationId);
    if (latestOperationIdRef.current === operationId) {
      latestOperationIdRef.current = Array.from(operationsRef.current.keys()).at(-1) ?? null;
    }
    for (const [backendMessageId, mappedOperationId] of backendMessageOperationIdsRef.current) {
      if (mappedOperationId === operationId) {
        backendMessageOperationIdsRef.current.delete(backendMessageId);
      }
    }

    if (operation.shouldRefreshFolders) {
      await loadFolders();
    }
  };

  const chatHub = useChatHub({
    shouldAutoConnect: !isMockMode,
    handlers: {
      onProcessingStarted: (event) => {
        const agentMessageId = Date.now().toString();
        operationsRef.current.set(event.operationId, {
          messageId: agentMessageId,
          createdFiles: [],
          shouldRefreshFolders: false,
        });
        latestOperationIdRef.current = event.operationId;

        setMessages((prev) => [
          ...prev,
          {
            id: agentMessageId,
            type: "agent",
            content: "",
            timestamp: new Date(),
            status: "processing",
          },
        ]);
      },

      onMessageChunk: (event: MessageChunkEvent) => {
        backendMessageOperationIdsRef.current.set(event.messageId, event.operationId);
        updateAgentMessage(
          event.operationId,
          (message) => ({
            ...message,
            content: `${message.content}${event.chunk}`,
            timestamp: new Date(),
          })
        );
      },

      onMessageCompleted: (event: MessageCompletedEvent) => {
        const operationId =
          extractOperationIdFromEvent(event) ??
          backendMessageOperationIdsRef.current.get(event.messageId) ??
          latestOperationIdRef.current;

        updateAgentMessage(
          operationId,
          (currentMessage) => ({
            ...currentMessage,
            timestamp: new Date(),
          })
        );
      },

      onFileCreated: (file: ChatHubFileDto) => {
        const operationId = getOperationIdFromEvent(file);
        const operation = operationId ? operationsRef.current.get(operationId) : undefined;
        operation?.createdFiles.push({
          name: file.name,
          folder: "",
          action: "created",
        });
        markFoldersForRefresh(operationId);
      },

      onFolderCreated: (folder: ChatHubFolderDto) => {
        markFoldersForRefresh(getOperationIdFromEvent(folder));
      },

      onFileMoved: (event) => {
        const operationId = getOperationIdFromEvent(event);
        const operation = operationId ? operationsRef.current.get(operationId) : undefined;
        const folderPath = event.toFolderId ? getFolderPathById?.(event.toFolderId) : null;
        operation?.createdFiles.push({
          name: event.fileName,
          folder: folderPath || "Корень",
          folderId: event.toFolderId ?? undefined,
          action: "sorted",
        });
        markFoldersForRefresh(operationId);
      },

      onProcessingCompleted: (event: ProcessingCompletedEvent) => {
        const operation = operationsRef.current.get(event.operationId);
        updateAgentMessage(event.operationId, (message) => ({
          ...message,
          status: "success" as const,
          timestamp: new Date(),
          result: operation?.createdFiles.length ? operation.createdFiles : undefined,
        }));
        void completeOperation(event.operationId);
      },

      onProcessingFailed: (event: ProcessingFailedEvent) => {
        updateAgentMessage(event.operationId, (message) => ({
          ...message,
          status: "error" as const,
          timestamp: new Date(),
          errorMessage: event.error,
        }));
        void completeOperation(event.operationId);
      },

      onProcessingCancelled: (event) => {
        updateAgentMessage(event.operationId, (message) => ({
          ...message,
          cancelled: true,
          status: "error" as const,
          timestamp: new Date(),
          errorMessage: "Обработка отменена",
        }));
        void completeOperation(event.operationId);
      },
    },
  });

  useEffect(() => {
    if (isMockMode) return;

    setMessages([]);
    sessionIdRef.current = null;
    operationsRef.current.clear();
    latestOperationIdRef.current = null;
    backendMessageOperationIdsRef.current.clear();
  }, [isMockMode, setMessages]);

  useEffect(() => {
    if (isChatView) {
      const randomIndex = Math.floor(Math.random() * CHAT_TITLES.length);
      setCurrentTitle(CHAT_TITLES[randomIndex]);
    }
  }, [isChatView, setCurrentTitle]);

  const handleSendMessageMock = useCallback((content: string, attachments?: Attachment[]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: content.trim(),
      attachments,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const agentMessageId = (Date.now() + 1).toString();

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: agentMessageId,
          type: "agent",
          content: "",
          timestamp: new Date(),
          status: "processing",
        },
      ]);
    }, 500);

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== agentMessageId) {
            return message;
          }

          if (Math.random() <= 0.2) {
            return {
              ...message,
              status: "error" as const,
              timestamp: new Date(),
              errorMessage: "Не удалось определить папку",
            };
          }

          return {
            ...message,
            status: "success" as const,
            timestamp: new Date(),
            result: attachments?.map((attachment) => ({
              name: attachment.name,
              folder: "📁 Учёба / Матан",
              folderId: "demo-folder-id",
              action: "sorted" as const,
            })) || [
              {
                name: "заметка.txt",
                folder: "📁 Заметки",
                folderId: "notes-folder",
                action: "created" as const,
              },
            ],
          };
        })
      );
    }, 2000);
  }, [setMessages]);

  const handleSendMessageReal = useCallback(async (content: string, attachments?: Attachment[]) => {
    const getAttachmentIds = (messageAttachments?: Attachment[]) => {
      const ids = messageAttachments
        ?.map((attachment) => attachment.serverId)
        .filter((id): id is string => Boolean(id)) ?? [];

      return Array.from(new Set(ids));
    };

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: content.trim(),
      attachments,
      timestamp: new Date(),
      status: "sending",
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      let normalizedAttachments = attachments;
      let attachmentIds = getAttachmentIds(normalizedAttachments);
      if (!sessionIdRef.current) {
        const session = await chatService.createChatSession();
        sessionIdRef.current = session.id;
      }
      const sessionId = sessionIdRef.current;

      if (attachments && attachments.length > 0) {
        const filesToUpload = attachments
          .filter((attachment) => attachment.file && !attachment.serverId)
          .map((attachment) => attachment.file!);

        if (filesToUpload.length > 0) {
          const uploadedAttachments = await chatService.uploadChatAttachments(filesToUpload);
          normalizedAttachments = applyServerIds(attachments, uploadedAttachments);
          attachmentIds = getAttachmentIds(normalizedAttachments);

          setMessages((prev) =>
            prev.map((message) =>
              message.id === userMessage.id
                ? { ...message, attachments: normalizedAttachments }
                : message
            )
          );
        }
      }

      await chatHub.sendMessage({
        sessionId,
        content: content.trim(),
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : null,
        context: null,
      });

      setMessages((prev) =>
        prev.map((message) =>
          message.id === userMessage.id ? { ...message, status: undefined } : message
        )
      );
    } catch (sendError) {
      console.error("Failed to send message:", sendError);
      toast.error("Не удалось отправить сообщение");

      setMessages((prev) =>
        prev.map((message) =>
          message.id === userMessage.id
            ? { ...message, status: "error" as const, errorMessage: "Ошибка отправки" }
            : message
        )
      );
    }
  }, [chatHub, setMessages]);

  const handleSendMessage = useCallback((content: string, attachments?: Attachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return;
    }

    if (isMockMode) {
      handleSendMessageMock(content, attachments);
      return;
    }

    void handleSendMessageReal(content, attachments);
  }, [handleSendMessageMock, handleSendMessageReal, isMockMode]);

  const handleCancelMessage = useCallback((messageId: string) => {
    const operationId = Array.from(operationsRef.current.entries())
      .find(([, operation]) => operation.messageId === messageId)?.[0] ?? latestOperationIdRef.current;

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              cancelled: true,
              status: "error" as const,
              timestamp: new Date(),
              errorMessage: "Обработка отменена",
            }
          : message
      )
    );
    void chatHub.cancelProcessing();
    void completeOperation(operationId);
  }, [chatHub, setMessages]);

  const handleRetryMessage = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, status: "processing" as const } : message
      )
    );
  }, [setMessages]);

  const handleResendMessage = useCallback((messageId: string) => {
    const message = messages.find((candidate) => candidate.id === messageId);
    if (message) {
      handleSendMessage(message.content, message.attachments);
    }
  }, [handleSendMessage, messages]);

  return {
    messages,
    currentTitle,
    handleSendMessage,
    handleCancelMessage,
    handleRetryMessage,
    handleResendMessage,
  };
}
