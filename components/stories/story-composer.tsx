import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { ChevronRight, Heart, ImagePlus, MapPin, PenLine, Trash2, X } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { PhotoSourceSheet } from '@/components/ui/photo-source-sheet'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { Couple } from '@/lib/api/couple'
import { useAuth } from '@/lib/auth/provider'
import { usePublishStory, useUploadStoryPhoto } from '@/lib/hooks/use-stories'
import { haptic } from '@/lib/utils/haptics'
import { pickImage, type PhotoSource } from '@/lib/utils/pick-image'

const CAPTION_MAX = 300
const PLACE_MAX = 120
const MEDIA_RADIUS = 24
const MODAL_SETTLE_MS = 400
const WHITE = '#fff'
const BLACK = '#000'
const WHITE_PLACEHOLDER = 'rgba(255,255,255,0.6)'
const STICKER = 'rgba(255,255,255,0.9)'
const TOP_SHADE = ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'] as const
const BOTTOM_SHADE = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'] as const
const PRESSED: ViewStyle = { transform: [{ scale: 0.97 }] }

export function StoryComposer({
  uri: initialUri,
  couple,
  onClose,
}: {
  uri: string
  couple: Couple | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const uploader = useUploadStoryPhoto()
  const publish = usePublishStory()

  const [uri, setUri] = useState(initialUri)
  const [caption, setCaption] = useState('')
  const [place, setPlace] = useState('')
  const [placeMenu, setPlaceMenu] = useState(false)
  const [placeDraft, setPlaceDraft] = useState<string | null>(null)
  const [choosingSource, setChoosingSource] = useState(false)
  const uploadRef = useRef<Promise<string> | null>(null)
  const uploadedUriRef = useRef<string | null>(null)
  const sharedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (uploadedUriRef.current === uri) return
    uploadedUriRef.current = uri
    const pending = uploader.start(uri)
    pending.catch(() => {})
    uploadRef.current = pending
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  const dropUpload = () => {
    if (!sharedRef.current && uploadRef.current) {
      void uploadRef.current.then(uploader.discard).catch(() => {})
    }
    uploadRef.current = null
  }

  const discard = () => {
    dropUpload()
    onClose()
  }

  const repick = (source: PhotoSource) => {
    setChoosingSource(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const result = await pickImage(source)
      if (result.status === 'denied') {
        showToast(t('log.cameraDenied'), 'error')
        return
      }
      if (result.status !== 'picked') return
      dropUpload()
      setUri(result.uri)
    }, MODAL_SETTLE_MS)
  }

  const share = (coupleId: string | null) => {
    const upload = uploadRef.current
    if (!upload) return
    sharedRef.current = true
    haptic('success')

    const label = place.trim()
    publish.mutate(
      {
        upload,
        caption,
        coupleId,
        place: label ? { label, lat: null, lon: null } : null,
      },
      {
        onSuccess: () => showToast(t('stories.published'), 'success'),
        onError: () => showToast(t('stories.publishFailed'), 'error'),
      },
    )
    onClose()
  }

  const openPlace = () => {
    haptic('tap')
    if (place.trim()) setPlaceMenu(true)
    else setPlaceDraft('')
  }

  const placeText = place.trim()

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={discard}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.media,
            { borderBottomLeftRadius: MEDIA_RADIUS, borderBottomRightRadius: MEDIA_RADIUS },
          ]}
        >
          <Image
            source={{ uri }}
            blurRadius={40}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, styles.backdrop]}
          />
          <Image source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFill} />

          <View style={{ paddingTop: insets.top }}>
            <LinearGradient
              pointerEvents="none"
              colors={TOP_SHADE}
              style={StyleSheet.absoluteFill}
            />
            <View className="flex-row items-center justify-between px-2 pb-8 pt-2">
              <IconButton label={t('stories.discard')} onPress={discard}>
                <X size={26} color={WHITE} />
              </IconButton>
              <View className="flex-row items-center gap-1">
                <IconButton
                  label={t('stories.otherPhoto')}
                  onPress={() => {
                    haptic('tap')
                    setChoosingSource(true)
                  }}
                >
                  <ImagePlus size={24} color={WHITE} />
                </IconButton>
                <IconButton label={t('stories.placeLabel')} onPress={openPlace}>
                  <MapPin size={24} color={WHITE} />
                </IconButton>
              </View>
            </View>
          </View>

          {placeText ? (
            <View className="items-center px-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('stories.placeEdit')}
                onPress={openPlace}
                style={({ pressed }) => [{ backgroundColor: STICKER }, pressed ? PRESSED : null]}
                className="h-11 max-w-full flex-row items-center gap-1.5 rounded-full px-4"
              >
                <MapPin size={16} color={BLACK} strokeWidth={2.5} />
                <Text numberOfLines={1} style={{ color: BLACK }} className="shrink text-[15px] font-semibold">
                  {placeText}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.captionArea}>
            <LinearGradient
              pointerEvents="none"
              colors={BOTTOM_SHADE}
              style={StyleSheet.absoluteFill}
            />
            <NativeTextInput
              value={caption}
              onChangeText={setCaption}
              maxLength={CAPTION_MAX}
              multiline
              accessibilityLabel={t('stories.captionPlaceholder')}
              placeholder={t('stories.captionPlaceholder')}
              placeholderTextColor={WHITE_PLACEHOLDER}
              selectionColor={WHITE}
              style={styles.caption}
            />
          </View>
        </View>

        <View
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          className="flex-row items-center gap-2 px-3 pt-3"
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => share(null)}
            style={({ pressed }) => [{ backgroundColor: WHITE }, pressed ? PRESSED : null]}
            className="h-12 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-full pl-1.5 pr-3"
          >
            {profile ? (
              <Avatar name={profile.display_name} src={profile.avatar_url} size="sm" />
            ) : null}
            <Text numberOfLines={1} style={{ color: BLACK }} className="min-w-0 flex-1 text-[15px] font-semibold">
              {t('stories.audienceFriends')}
            </Text>
            <ChevronRight size={20} color={BLACK} strokeWidth={2.5} />
          </Pressable>
          {couple ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => share(couple.id)}
              style={({ pressed }) => [{ backgroundColor: colors.brand }, pressed ? PRESSED : null]}
              className="h-12 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-full pl-1.5 pr-3"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Heart size={20} color={WHITE} fill={WHITE} />
              </View>
              <Text numberOfLines={1} style={{ color: WHITE }} className="min-w-0 flex-1 text-[15px] font-semibold">
                {t('stories.audienceCouple', { name: couple.partner.displayName })}
              </Text>
              <ChevronRight size={20} color={WHITE} strokeWidth={2.5} />
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <PhotoSourceSheet
        open={choosingSource}
        onClose={() => setChoosingSource(false)}
        onPick={repick}
      />

      <Sheet
        open={placeMenu}
        onClose={() => setPlaceMenu(false)}
        title={t('stories.placeLabel')}
        description={placeText || undefined}
        closeLabel={t('common.close')}
      >
        <View className="gap-2.5 pb-2 pt-1">
          <Button
            title={t('stories.placeEdit')}
            variant="secondary"
            size="lg"
            fullWidth
            icon={<PenLine size={18} color={colors.text} />}
            onPress={() => setPlaceDraft(place)}
          />
          <Button
            title={t('stories.placeRemove')}
            variant="danger"
            size="lg"
            fullWidth
            icon={<Trash2 size={18} color={WHITE} />}
            onPress={() => {
              haptic('tap')
              setPlace('')
              setPlaceMenu(false)
            }}
          />
        </View>

        {placeMenu ? (
          <PlacePrompt
            draft={placeDraft}
            onChange={setPlaceDraft}
            onCancel={() => setPlaceDraft(null)}
            onSubmit={() => {
              setPlace(placeDraft ?? '')
              setPlaceDraft(null)
              setPlaceMenu(false)
            }}
          />
        ) : null}
      </Sheet>

      {placeMenu ? null : (
        <PlacePrompt
          draft={placeDraft}
          onChange={setPlaceDraft}
          onCancel={() => setPlaceDraft(null)}
          onSubmit={() => {
            setPlace(placeDraft ?? '')
            setPlaceDraft(null)
          }}
        />
      )}
    </Modal>
  )
}

function PlacePrompt({
  draft,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: string | null
  onChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}) {
  const { t } = useI18n()

  return (
    <Sheet
      open={draft !== null}
      onClose={onCancel}
      title={t('stories.placeLabel')}
      closeLabel={t('common.close')}
      footer={<Button title={t('common.save')} fullWidth onPress={onSubmit} />}
    >
      <View className="pb-1 pt-1">
        <TextInput
          value={draft ?? ''}
          onChangeText={onChange}
          placeholder={t('stories.placePlaceholder')}
          maxLength={PLACE_MAX}
          autoCapitalize="sentences"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },
  media: { flex: 1, overflow: 'hidden', backgroundColor: BLACK },
  backdrop: { opacity: 0.5, transform: [{ scale: 1.25 }] },
  captionArea: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 20,
  },
  caption: {
    color: WHITE,
    fontSize: 17,
    paddingVertical: 0,
    maxHeight: 160,
  },
})
