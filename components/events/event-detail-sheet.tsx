import { useQuery } from '@tanstack/react-query'
import { Camera, ImagePlus, Pencil, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { useCountdownLabel } from '@/components/events/countdown'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Spinner } from '@/components/ui/feedback'
import { PhotoViewer } from '@/components/ui/photo-viewer'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useActivityHex, useThemeColors, withTint } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import { resolveEventPhotoUrl } from '@/lib/api/storage'
import type { EventPhoto, EventSummary } from '@/lib/api/types'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import {
  useDeleteEvent,
  useEvent,
  useEventPhotos,
  useLeaveEvent,
  useRespondToInvite,
  useUploadEventPhoto,
} from '@/lib/hooks/use-events'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatDateRange } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'
import { pickImage, type PhotoSource } from '@/lib/utils/pick-image'

// La ficha de evento de la web: fecha y cuenta atras, quien viene con su
// estado, responder a la invitacion, fotos compartidas, y editar/borrar para
// quien organiza o salir para el resto.
export function EventDetailSheet({
  eventId,
  onClose,
  onEdit,
}: {
  eventId: string | null
  onClose: () => void
  onEdit: (event: EventSummary) => void
}) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const countdownLabel = useCountdownLabel()

  const { data: event, isLoading } = useEvent(eventId)
  const { data: photos } = useEventPhotos(eventId)
  const respond = useRespondToInvite()
  const leave = useLeaveEvent()
  const remove = useDeleteEvent()
  const uploadPhoto = useUploadEventPhoto()

  const [confirming, setConfirming] = useState<'leave' | 'delete' | null>(null)
  const hex = useActivityHex(event?.color ?? 'blue')

  const isCreator = event !== undefined && event !== null && event.creator_id === userId
  const myMembership = event?.members.find((member) => member.user_id === userId)
  const going = event?.members.filter((member) => member.status === 'going') ?? []

  const pickPhoto = async (source: PhotoSource) => {
    if (!event || !userId) return
    const picked = await pickImage(source)
    if (picked.status === 'denied') {
      showToast(t('log.cameraDenied'), 'error')
      return
    }
    if (picked.status !== 'picked') return
    haptic('tap')
    uploadPhoto.mutate(
      { eventId: event.id, uri: picked.uri },
      { onError: () => showToast(t('common.genericError'), 'error') },
    )
  }

  const answer = (status: 'going' | 'declined') => {
    if (!event || !userId) return
    haptic('success')
    // El toast de exito sale ya, que es lo que hace que la respuesta se sienta
    // inmediata, pero si la mutacion falla hay que decirlo: antes se quedaba en
    // un "guardado" que no habia guardado nada.
    respond.mutate(
      { eventId: event.id, userId, status },
      { onError: () => showToast(t('common.genericError'), 'error') },
    )
    showToast(t('events.respondSaved'), 'success')
  }

  return (
    <Sheet
      open={eventId !== null}
      onClose={onClose}
      title={event?.title ?? t('events.detailTitle')}
      closeLabel={t('common.close')}
    >
      {isLoading || !event ? (
        <Spinner className="py-16" />
      ) : (
        <View className="gap-5 pb-2 pt-1">
          <View className="flex-row items-center gap-3">
            <ActivityIcon icon={event.icon} color={event.color} size="md" />
            <View className="min-w-0 flex-1">
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                {formatDateRange(event.starts_at, event.ends_at, event.all_day, locale, timeZone)}
              </Text>
              <View
                className="mt-1.5 self-start rounded-full px-2.5 py-1"
                style={{ backgroundColor: withTint(hex) }}
              >
                <Text className="text-[11px] font-bold" style={{ color: hex }}>
                  {countdownLabel(event)}
                </Text>
              </View>
            </View>
          </View>

          {event.description ? (
            <Text className="text-sm leading-relaxed text-text-muted dark:text-text-muted-dark">
              {event.description}
            </Text>
          ) : null}

          {myMembership?.status === 'invited' ? (
            <View className="gap-2 rounded-3xl border border-brand bg-brand-soft p-4 dark:bg-brand-soft-dark">
              <Text className="text-sm font-extrabold text-text dark:text-text-dark">
                {t('events.respondTitle')}
              </Text>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button title={t('events.respondGoing')} size="sm" fullWidth onPress={() => answer('going')} />
                </View>
                <View className="flex-1">
                  <Button
                    title={t('events.respondDeclined')}
                    size="sm"
                    variant="secondary"
                    fullWidth
                    onPress={() => answer('declined')}
                  />
                </View>
              </View>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text-muted dark:text-text-muted-dark">
              {t('events.membersTitle')} · {t('events.goingCount', { count: going.length })}
            </Text>
            {event.members.map((member) => (
              <View key={member.user_id} className="flex-row items-center gap-2.5">
                <Avatar name={member.profile.display_name} src={member.profile.avatar_url} size="sm" />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
                    {member.user_id === userId ? t('events.you') : member.profile.display_name}
                    {member.user_id === event.creator_id ? (
                      <Text className="text-xs font-semibold text-text-subtle dark:text-text-subtle-dark">
                        {'  '}· {t('events.organizer')}
                      </Text>
                    ) : null}
                  </Text>
                </View>
                <Text
                  className="text-xs font-bold"
                  style={{
                    color:
                      member.status === 'going'
                        ? colors.success
                        : member.status === 'declined'
                          ? colors.textSubtle
                          : colors.brand,
                  }}
                >
                  {t(`events.status.${member.status}` as TranslationKey)}
                </Text>
              </View>
            ))}
            {myMembership && myMembership.status !== 'invited' && !isCreator ? (
              <Button
                title={t('events.changeResponse')}
                variant="ghost"
                size="sm"
                onPress={() => answer(myMembership.status === 'going' ? 'declined' : 'going')}
              />
            ) : null}
          </View>

          <View className="gap-2">
            <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text-muted dark:text-text-muted-dark">
              {t('events.photosTitle')}
            </Text>
            <EventPhotoGrid photos={photos ?? []} />
            {uploadPhoto.isPending ? (
              <Button
                title={t('events.photoUploading')}
                variant="secondary"
                size="sm"
                fullWidth
                loading
              />
            ) : (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    title={t('log.sourceCamera')}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    icon={<Camera size={16} color={colors.text} />}
                    onPress={() => void pickPhoto('camera')}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title={t('log.sourceLibrary')}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    icon={<ImagePlus size={16} color={colors.text} />}
                    onPress={() => void pickPhoto('library')}
                  />
                </View>
              </View>
            )}
          </View>

          <View className="flex-row justify-center gap-2 pt-1">
            {isCreator ? (
              <>
                <Button
                  title={t('common.edit')}
                  variant="secondary"
                  size="sm"
                  icon={<Pencil size={16} color={colors.text} />}
                  onPress={() => onEdit(event)}
                />
                <Button
                  title={t('common.delete')}
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={16} color={colors.danger} />}
                  onPress={() => setConfirming('delete')}
                />
              </>
            ) : (
              <Button
                title={t('events.leave')}
                variant="ghost"
                size="sm"
                onPress={() => setConfirming('leave')}
              />
            )}
          </View>

          <ConfirmDialog
            open={confirming !== null}
            title={
              confirming === 'delete'
                ? t('events.deleteTitle', { title: event.title })
                : t('events.leaveTitle')
            }
            body={confirming === 'delete' ? t('events.deleteBody') : t('events.leaveBody')}
            confirmLabel={confirming === 'delete' ? t('common.delete') : t('events.leave')}
            onConfirm={() => {
              if (!userId) return
              haptic('warning')
              const onError = () => showToast(t('common.genericError'), 'error')
              if (confirming === 'delete') {
                remove.mutate({ eventId: event.id, userId }, { onError })
                showToast(t('events.deleted'), 'success')
              } else {
                leave.mutate({ eventId: event.id, userId }, { onError })
                showToast(t('events.left'), 'success')
              }
              setConfirming(null)
              onClose()
            }}
            onCancel={() => setConfirming(null)}
          />
        </View>
      )}
    </Sheet>
  )
}

function EventPhotoGrid({ photos }: { photos: EventPhoto[] }) {
  const { t } = useI18n()
  const [viewerSrc, setViewerSrc] = useState<string | null>(null)

  if (photos.length === 0) {
    return (
      <Text className="px-1 text-xs text-text-subtle dark:text-text-subtle-dark">
        {t('events.photosEmpty')}
      </Text>
    )
  }

  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo) => (
          <EventPhotoThumb key={photo.id} photo={photo} onOpen={setViewerSrc} />
        ))}
      </View>
      <PhotoViewer
        open={viewerSrc !== null}
        src={viewerSrc}
        onClose={() => setViewerSrc(null)}
        closeLabel={t('common.close')}
      />
    </>
  )
}

function EventPhotoThumb({
  photo,
  onOpen,
}: {
  photo: EventPhoto
  onOpen: (src: string) => void
}) {
  const { data: url } = useQuery({
    queryKey: queryKeys.eventPhotoUrl(photo.photo_url),
    staleTime: 50 * 60 * 1000,
    queryFn: () => resolveEventPhotoUrl(getSupabaseBrowserClient(), photo.photo_url),
  })

  if (!url) return <View className="h-24 w-24 rounded-2xl bg-surface-sunken dark:bg-surface-sunken-dark" />

  return (
    <Pressable accessibilityRole="imagebutton" onPress={() => onOpen(url)}>
      <Image source={{ uri: url }} className="h-24 w-24 rounded-2xl" />
    </Pressable>
  )
}
