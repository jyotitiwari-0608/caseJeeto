import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { getSocket } from '@/lib/socket'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/api'

interface JoinAck { ok: boolean; error?: string }
interface SendAck { ok: boolean; message?: ChatMessage; error?: string }
interface NewMessagePayload { conversationId: string; message: ChatMessage }
interface TypingPayload { conversationId: string; userId: string; isTyping: boolean }

const TYPING_IDLE_MS = 2000

interface ChatWindowProps {
  conversationId: string
  initialMessages: ChatMessage[]
  /** Called once this conversation has been successfully joined — a good
   *  place to also fire a REST mark-read call for the sidebar badge. */
  onJoined?: () => void
}

export function ChatWindow({ conversationId, initialMessages, onJoined }: ChatWindowProps) {
  const { user, accessToken } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [peerTyping, setPeerTyping] = useState(false)
  const [joinError, setJoinError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setMessages(initialMessages), [conversationId, initialMessages])

  useEffect(() => {
    if (!accessToken) return
    const socket = getSocket(accessToken)

    socket.emit('join_conversation', conversationId, (response: JoinAck) => {
      if (!response?.ok) {
        setJoinError(response?.error || 'Could not join this conversation live. Messages already sent will still load.')
        return
      }
      setJoinError('')
      onJoined?.()
    })

    function handleNewMessage(payload: NewMessagePayload) {
      if (payload.conversationId !== conversationId) return
      setMessages((previous) => (previous.some((message) => message._id === payload.message._id) ? previous : [...previous, payload.message]))
      socket.emit('mark_read', conversationId)
    }

    function handleTyping(payload: TypingPayload) {
      if (payload.conversationId !== conversationId || payload.userId === user?.id) return
      setPeerTyping(payload.isTyping)
    }

    socket.on('new_message', handleNewMessage)
    socket.on('typing', handleTyping)

    return () => {
      socket.emit('leave_conversation', conversationId)
      socket.off('new_message', handleNewMessage)
      socket.off('typing', handleTyping)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, accessToken])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  function emitTyping(isTyping: boolean) {
    if (!accessToken) return
    getSocket(accessToken).emit('typing', { conversationId, isTyping })
  }

  function handleDraftChange(value: string) {
    setDraft(value)
    emitTyping(value.trim().length > 0)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), TYPING_IDLE_MS)
  }

  function send() {
    const text = draft.trim()
    if (!text || !accessToken || sending) return
    setSending(true)
    getSocket(accessToken).emit('send_message', { conversationId, text }, (response: SendAck) => {
      setSending(false)
      if (response?.ok && response.message) {
        setMessages((previous) => [...previous, response.message!])
        setDraft('')
        emitTyping(false)
      }
    })
  }

  return (
    <div className="flex h-[32rem] flex-col rounded-xl border bg-card">
      {joinError && <p className="border-b bg-destructive/5 px-4 py-2 text-xs text-destructive">{joinError}</p>}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>}
        {messages.map((message) => (
          <div key={message._id} className={cn('max-w-[75%] rounded-lg px-3 py-2 text-sm', message.senderId === user?.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted')}>
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
            <p className="mt-1 text-[0.65rem] opacity-60">{new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.sentAt))}</p>
          </div>
        ))}
        {peerTyping && <p className="text-xs text-muted-foreground">Typing…</p>}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={draft}
          onChange={(event) => handleDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              send()
            }
          }}
          placeholder="Write a message…"
          className="min-h-10"
          maxLength={5000}
        />
        <Button size="icon" onClick={send} disabled={!draft.trim() || sending} aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}
