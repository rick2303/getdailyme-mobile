import { Archive, ArchiveRestore, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { ActivityEditorSheet } from '@/components/activities/activity-editor-sheet'
import { IconButton } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { Activity } from '@/lib/api/types'
import { useCurrentUserId } from '@/lib/auth/provider'
import {
  useActivities,
  useDeleteActivity,
  useReorderActivities,
  useUpdateActivity,
} from '@/lib/hooks/use-activities'
import { haptic } from '@/lib/utils/haptics'

// La gestion de actividades del perfil web: editar, archivar, borrar y
// reordenar (con flechas en vez de arrastre, que en una lista dentro de una
// hoja el drag pelea con el scroll).
export function ManageActivitiesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const { data: activities } = useActivities()
  const update = useUpdateActivity()
  const remove = useDeleteActivity()
  const reorder = useReorderActivities()

  const [editing, setEditing] = useState<Activity | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Activity | null>(null)

  const list = [...(activities ?? [])].sort((a, b) => a.position - b.position)
  const active = list.filter((activity) => !activity.is_archived)
  const archived = list.filter((activity) => activity.is_archived)

  const move = (activity: Activity, direction: -1 | 1) => {
    const ids = active.map((item) => item.id)
    const index = ids.indexOf(activity.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= ids.length) return
    haptic('tap')
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate([...ids, ...archived.map((item) => item.id)], {
      onError: () => showToast(t('common.genericError'), 'error'),
    })
  }

  const setArchived = (activity: Activity, isArchived: boolean) => {
    if (!userId) return
    haptic('tap')
    update.mutate({ userId, activityId: activity.id, patch: { is_archived: isArchived } })
  }

  const confirmDelete = () => {
    if (!pendingDelete || !userId) return
    haptic('warning')
    remove.mutate(
      { userId, activityId: pendingDelete.id },
      { onError: () => showToast(t('activity.deleteFailed'), 'error') },
    )
    showToast(t('activity.deleted'), 'success')
    setPendingDelete(null)
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={t('activity.manageTitle')}
        closeLabel={t('common.close')}
      >
        <View className="gap-4 pt-2">
          {list.length === 0 ? (
            <Text className="py-6 text-center text-sm text-text-muted dark:text-text-muted-dark">
              {t('activity.manageEmpty')}
            </Text>
          ) : null}

          {active.map((activity, index) => (
            <View key={activity.id} className="flex-row items-center gap-2.5">
              <ActivityIcon icon={activity.icon} color={activity.color} size="sm" />
              <Text
                className="min-w-0 flex-1 text-sm font-bold text-text dark:text-text-dark"
                numberOfLines={1}
              >
                {activity.name}
              </Text>
              <IconButton
                label={t('activity.moveUp')}
                disabled={index === 0}
                onPress={() => move(activity, -1)}
                className="h-9 w-9"
              >
                <ChevronUp size={16} color={colors.textMuted} />
              </IconButton>
              <IconButton
                label={t('activity.moveDown')}
                disabled={index === active.length - 1}
                onPress={() => move(activity, 1)}
                className="h-9 w-9"
              >
                <ChevronDown size={16} color={colors.textMuted} />
              </IconButton>
              <IconButton
                label={t('common.edit')}
                onPress={() => setEditing(activity)}
                className="h-9 w-9"
              >
                <Pencil size={16} color={colors.textMuted} />
              </IconButton>
              <IconButton
                label={t('activity.archive')}
                onPress={() => setArchived(activity, true)}
                className="h-9 w-9"
              >
                <Archive size={16} color={colors.textMuted} />
              </IconButton>
            </View>
          ))}

          {archived.length > 0 ? (
            <View className="gap-3 border-t border-border pt-3 dark:border-border-dark">
              <Text className="px-1 text-xs font-bold uppercase tracking-wide text-text-subtle dark:text-text-subtle-dark">
                {t('activity.archived')}
              </Text>
              {archived.map((activity) => (
                <View key={activity.id} className="flex-row items-center gap-2.5 opacity-70">
                  <ActivityIcon icon={activity.icon} color={activity.color} size="sm" />
                  <Text
                    className="min-w-0 flex-1 text-sm font-bold text-text dark:text-text-dark"
                    numberOfLines={1}
                  >
                    {activity.name}
                  </Text>
                  <IconButton
                    label={t('activity.unarchive')}
                    onPress={() => setArchived(activity, false)}
                    className="h-9 w-9"
                  >
                    <ArchiveRestore size={16} color={colors.textMuted} />
                  </IconButton>
                  <IconButton
                    label={t('common.delete')}
                    onPress={() => setPendingDelete(activity)}
                    className="h-9 w-9"
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </IconButton>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Sheet>

      <ActivityEditorSheet
        open={editing !== null}
        activity={editing}
        onClose={() => setEditing(null)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('activity.deleteTitle', { name: pendingDelete?.name ?? '' })}
        body={t('activity.deleteBody')}
        confirmLabel={t('common.delete')}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  )
}
