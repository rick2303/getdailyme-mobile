import { MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput as RNTextInput, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { IconButton } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { useToast } from '@/components/ui/toast'
import type { ReportSheetTarget } from '@/components/feed/report-sheet'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { MAX_COMMENT_LENGTH, type CommentThread, type FeedComment } from '@/lib/api/types'
import { useCurrentUserId } from '@/lib/auth/provider'
import { buildThreads, countReplies } from '@/lib/feed/threads'
import { useAddComment, useComments, useDeleteComment, useEditComment } from '@/lib/hooks/use-comments'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'
import { haptic } from '@/lib/utils/haptics'

type ReplyTarget = { rootId: string; to: FeedComment }

// El mismo sistema de hilos de la web: un nivel, respuestas plegadas, editar
// con banda de estado, y denunciar en lo ajeno.
export function FeedComments({
  logId,
  logOwnerId,
  count,
  onOpenProfile,
  onReport,
}: {
  logId: string
  logOwnerId: string
  count: number
  onOpenProfile: (userId: string) => void
  onReport: (target: ReportSheetTarget) => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const currentUserId = useCurrentUserId()

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null)
  const [editing, setEditing] = useState<FeedComment | null>(null)
  const [expanded, setExpanded] = useState<string[]>([])

  const { data: comments, isLoading } = useComments(logId, open)
  const addComment = useAddComment(logId)
  const editComment = useEditComment(logId)
  const deleteComment = useDeleteComment(logId)

  const threads = useMemo(() => buildThreads(comments ?? []), [comments])
  const total = comments?.length ?? count

  const trimmed = draft.trim()
  const canSend = trimmed.length > 0 && trimmed.length <= MAX_COMMENT_LENGTH

  const send = async () => {
    if (!canSend) return
    haptic('tap')
    try {
      if (editing) {
        await editComment.mutateAsync({ commentId: editing.id, body: trimmed })
        setEditing(null)
      } else {
        await addComment.mutateAsync({
          body: trimmed,
          parentId: replyTo?.rootId ?? null,
          replyToUserId: replyTo && replyTo.to.id !== replyTo.rootId ? replyTo.to.user_id : null,
        })
        setReplyTo(null)
      }
      setDraft('')
    } catch {
      showToast(t('comments.sendError'), 'error')
    }
  }

  const remove = async (commentId: string) => {
    haptic('warning')
    try {
      await deleteComment.mutateAsync(commentId)
    } catch {
      showToast(t('common.genericError'), 'error')
    }
  }

  return (
    <View className="mt-2">
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen((value) => !value)}
        hitSlop={{ top: 6, bottom: 6 }}
        className="min-h-10 flex-row items-center gap-1.5 active:opacity-70"
      >
        <MessageCircle size={16} color={colors.textSubtle} />
        <Text className="text-xs font-bold text-text-subtle dark:text-text-subtle-dark">
          {total > 0 ? t('comments.count', { count: total }) : t('comments.add')}
        </Text>
      </Pressable>

      {open ? (
        <View className="gap-3 pt-1">
          {isLoading ? (
            <Spinner className="py-2" />
          ) : threads.length === 0 ? (
            <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
              {t('comments.empty')}
            </Text>
          ) : (
            <View className="gap-3">
              {threads.map((thread) => (
                <Thread
                  key={thread.root.id}
                  thread={thread}
                  logOwnerId={logOwnerId}
                  currentUserId={currentUserId}
                  isOpen={expanded.includes(thread.root.id)}
                  onToggle={() =>
                    setExpanded((current) =>
                      current.includes(thread.root.id)
                        ? current.filter((id) => id !== thread.root.id)
                        : [...current, thread.root.id],
                    )
                  }
                  onReply={(to) => {
                    haptic('tap')
                    // Salir de una edicion tiene que llevarse su texto: si no,
                    // el cuerpo del comentario que se estaba editando se enviaba
                    // como respuesta.
                    if (editing) setDraft('')
                    setEditing(null)
                    setReplyTo({ rootId: thread.root.id, to })
                    setExpanded((current) =>
                      current.includes(thread.root.id) ? current : [...current, thread.root.id],
                    )
                  }}
                  onEdit={(comment) => {
                    haptic('tap')
                    setReplyTo(null)
                    setEditing(comment)
                    setDraft(comment.body)
                  }}
                  onRemove={(commentId) => void remove(commentId)}
                  onOpenProfile={onOpenProfile}
                  onReport={onReport}
                />
              ))}
            </View>
          )}

          {editing ? (
            <StatusBand
              icon={<Pencil size={14} color={colors.textSubtle} />}
              text={t('comments.editing')}
              onCancel={() => {
                setEditing(null)
                setDraft('')
              }}
            />
          ) : null}

          {replyTo ? (
            <StatusBand
              icon={<MessageCircle size={14} color={colors.textSubtle} />}
              text={t('comments.replyingTo', { name: replyTo.to.author.display_name })}
              onCancel={() => setReplyTo(null)}
            />
          ) : null}

          <View className="flex-row items-end gap-2">
            <RNTextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={
                replyTo
                  ? t('comments.replyPlaceholder', { name: replyTo.to.author.display_name })
                  : t('comments.placeholder')
              }
              placeholderTextColor={colors.textSubtle}
              maxLength={MAX_COMMENT_LENGTH}
              multiline
              accessibilityLabel={t('comments.inputLabel')}
              className="min-h-11 flex-1 rounded-2xl border border-border bg-surface-sunken px-3.5 py-2.5 text-base text-text dark:border-border-dark dark:bg-surface-sunken-dark dark:text-text-dark"
            />
            <IconButton
              label={t('comments.send')}
              disabled={!canSend || addComment.isPending || editComment.isPending}
              onPress={() => void send()}
              className="bg-brand"
            >
              <Send size={16} color="#fff" />
            </IconButton>
          </View>
        </View>
      ) : null}
    </View>
  )
}

function StatusBand({
  icon,
  text,
  onCancel,
}: {
  icon: React.ReactNode
  text: string
  onCancel: () => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()

  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2 dark:bg-surface-sunken-dark">
      {icon}
      <Text
        className="min-w-0 flex-1 text-xs font-semibold text-text-muted dark:text-text-muted-dark"
        numberOfLines={1}
      >
        {text}
      </Text>
      <Pressable
        className="active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
        hitSlop={10}
        onPress={onCancel}
      >
        <X size={16} color={colors.textSubtle} />
      </Pressable>
    </View>
  )
}

function Thread({
  thread,
  logOwnerId,
  currentUserId,
  isOpen,
  onToggle,
  onReply,
  onEdit,
  onRemove,
  onOpenProfile,
  onReport,
}: {
  thread: CommentThread
  logOwnerId: string
  currentUserId: string | null
  isOpen: boolean
  onToggle: () => void
  onReply: (to: FeedComment) => void
  onEdit: (comment: FeedComment) => void
  onRemove: (commentId: string) => void
  onOpenProfile: (userId: string) => void
  onReport: (target: ReportSheetTarget) => void
}) {
  const { t } = useI18n()
  const replyCount = countReplies([thread])

  return (
    <View className="gap-2">
      <CommentRow
        comment={thread.root}
        logOwnerId={logOwnerId}
        currentUserId={currentUserId}
        onReply={() => onReply(thread.root)}
        onEdit={() => onEdit(thread.root)}
        onRemove={() => onRemove(thread.root.id)}
        onOpenProfile={onOpenProfile}
        onReport={onReport}
      />

      {replyCount > 0 ? (
        <View className="gap-2 pl-10">
          <Pressable
            accessibilityRole="button"
            onPress={onToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="min-h-8 justify-center active:opacity-70"
          >
            <Text className="text-xs font-bold text-text-subtle dark:text-text-subtle-dark">
              {isOpen ? t('comments.hideReplies') : t('comments.showReplies', { count: replyCount })}
            </Text>
          </Pressable>
          {isOpen
            ? thread.replies.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  logOwnerId={logOwnerId}
                  currentUserId={currentUserId}
                  onReply={() => onReply(reply)}
                  onEdit={() => onEdit(reply)}
                  onRemove={() => onRemove(reply.id)}
                  onOpenProfile={onOpenProfile}
                  onReport={onReport}
                />
              ))
            : null}
        </View>
      ) : null}
    </View>
  )
}

function CommentRow({
  comment,
  logOwnerId,
  currentUserId,
  onReply,
  onEdit,
  onRemove,
  onOpenProfile,
  onReport,
}: {
  comment: FeedComment
  logOwnerId: string
  currentUserId: string | null
  onReply: () => void
  onEdit: () => void
  onRemove: () => void
  onOpenProfile: (userId: string) => void
  onReport: (target: ReportSheetTarget) => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const relativeTime = useRelativeTime()
  const isOwn = comment.user_id === currentUserId
  const canDelete = isOwn || logOwnerId === currentUserId
  const wasEdited = comment.updated_at > comment.created_at

  return (
    <View className="flex-row items-start gap-2.5">
      <Pressable className="active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={t('profileCard.open', { name: comment.author.display_name })}
        onPress={() => onOpenProfile(comment.author.id)}
      >
        <Avatar name={comment.author.display_name} src={comment.author.avatar_url} size="sm" />
      </Pressable>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-baseline gap-1.5">
          <Text className="text-xs font-bold text-text dark:text-text-dark" numberOfLines={1}>
            {comment.author.display_name}
          </Text>
          <Text className="text-[10px] text-text-subtle dark:text-text-subtle-dark">
            {relativeTime(comment.created_at)}
            {wasEdited ? ` · ${t('comments.edited')}` : ''}
          </Text>
        </View>

        <Text className="text-sm leading-relaxed text-text-muted dark:text-text-muted-dark">
          {comment.reply_to ? (
            <Text className="font-bold text-brand dark:text-brand-dark">
              @{comment.reply_to.username}{' '}
            </Text>
          ) : null}
          {comment.body}
        </Text>

        <View className="mt-0.5 flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            onPress={onReply}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="min-h-8 justify-center active:opacity-70"
          >
            <Text className="text-[11px] font-bold text-text-subtle dark:text-text-subtle-dark">
              {t('comments.reply')}
            </Text>
          </Pressable>
          {isOwn ? (
            <Pressable
              accessibilityRole="button"
              onPress={onEdit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="min-h-8 justify-center active:opacity-70"
            >
              <Text className="text-[11px] font-bold text-text-subtle dark:text-text-subtle-dark">
                {t('comments.edit')}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => onReport({ type: 'comment', commentId: comment.id })}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="min-h-8 justify-center active:opacity-70"
            >
              <Text className="text-[11px] font-bold text-text-subtle dark:text-text-subtle-dark">
                {t('report.comment')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {canDelete ? (
        <IconButton label={t('comments.delete')} onPress={onRemove} className="h-9 w-9">
          <Trash2 size={16} color={colors.textSubtle} />
        </IconButton>
      ) : null}
    </View>
  )
}
