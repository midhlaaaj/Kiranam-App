// React Native's built-in Share API can't attach both a caption and an
// image in one native share sheet — it's text-only on Android and
// text-OR-url on iOS. react-native-share's Share.open() can combine both,
// but only with a local file URI (Android's share intent won't resolve a
// remote http(s) URL), so the cover image is downloaded to cache first.
import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

export async function shareWithCoverImage(message: string, imageUrl?: string | null): Promise<void> {
  // Lazy require, not a static import: react-native-share is a native
  // module that doesn't exist in Expo Go. Its own module-level code calls
  // TurboModuleRegistry.getEnforcing() as soon as it's loaded, so even a
  // top-level `import` (with the module never used) crashes every screen
  // that imports this file there. Deferring to a require() inside this
  // function, only run when a share is actually attempted, contains the
  // failure to here instead of taking down the whole route.
  let RNShare: typeof import('react-native-share').default | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    RNShare = require('react-native-share').default;
  } catch {
    RNShare = undefined;
  }

  if (!RNShare) {
    // Expo Go (or any build without the native module linked) — still
    // get a working share sheet, just without the combined image.
    await Share.share({ message });
    return;
  }

  if (imageUrl) {
    try {
      const file = await File.downloadFileAsync(imageUrl, Paths.cache);
      await RNShare.open({ message, url: file.uri, failOnCancel: false });
      return;
    } catch {
      // Image download or the share sheet itself failed (e.g. bad URL,
      // user has no share targets for images) — still get the text out.
    }
  }
  await RNShare.open({ message, failOnCancel: false });
}
