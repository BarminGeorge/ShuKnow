import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { useChat } from '../useChat';

describe('useChat', () => {
  it('should return initial values', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useChat(), { wrapper });
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.currentTitle).toBe('Привет! Чем могу помочь?');
  });

  it('should allow setting messages', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    const mockMessages = [
      { id: '1', type: 'user' as const, content: 'Hello', timestamp: new Date() },
      { id: '2', type: 'agent' as const, content: 'Hi there!', timestamp: new Date() },
    ];

    act(() => {
      result.current.setMessages(mockMessages);
    });

    expect(result.current.messages).toEqual(mockMessages);
  });

  it('should allow changing title', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.setCurrentTitle('New Chat Title');
    });

    expect(result.current.currentTitle).toBe('New Chat Title');
  });

  it('should send message', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useChat(), { wrapper });

    act(() => {
      result.current.sendMessage('Test message');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Test message');
    expect(result.current.messages[0].type).toBe('user');
  });
});
