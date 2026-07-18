export const NOTIFICATION_SOUNDS = [
  { key: 'none',  label: 'None',         file: null },
  { key: 'chime', label: 'Soft Chime',   file: '/sounds/notify-chime.mp3' },
  { key: 'bell',  label: 'Bell',         file: '/sounds/notify-bell.mp3' },
  { key: 'bowl',  label: 'Tibetan Bowl', file: '/sounds/notify-bowl.mp3' },
];

export const AMBIENT_SOUNDS = [
  { key: 'none',       label: 'None',         file: null },
  { key: 'rain',       label: 'Rain',         file: '/sounds/ambient-rain.wav' },
  { key: 'cafe',       label: 'Coffee Shop',  file: '/sounds/ambient-cafe.wav' },
  { key: 'whitenoise', label: 'White Noise',  file: '/sounds/ambient-whitenoise.wav' },
  { key: 'forest',     label: 'Forest',       file: '/sounds/ambient-forest.mp3' },
];

export function getSoundFile(key, soundList) {
  return soundList.find(s => s.key === key)?.file ?? null;
}
