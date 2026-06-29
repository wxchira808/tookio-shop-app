/**
 * crossAlert.js
 *
 * A drop-in cross-platform replacement for React Native's Alert.
 *
 * On native: delegates to the real RN Alert (native OS dialog).
 * On web: uses window.confirm for destructive confirm dialogs,
 *         and window.alert for simple notifications.
 *
 * Usage - same API as Alert.alert():
 *   import { crossAlert } from '@/utils/crossAlert';
 *   crossAlert('Title', 'Message');
 *   crossAlert('Title', 'Message', [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Delete', style: 'destructive', onPress: () => doDelete() },
 *   ]);
 */
import { Alert, Platform } from 'react-native';

export function crossAlert(title, message, buttons, options) {
  if (Platform.OS !== 'web') {
    // Native — use real OS alert
    Alert.alert(title, message, buttons, options);
    return;
  }

  // Web fallback
  if (!buttons || buttons.length === 0) {
    // Simple notification
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  // Check if there's a destructive or confirm button (not just cancel)
  const actionButtons = buttons.filter(
    (b) => b.style !== 'cancel' && b.text?.toLowerCase() !== 'cancel'
  );
  const cancelButton = buttons.find(
    (b) => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel'
  );

  if (actionButtons.length === 1 && cancelButton) {
    // Has a confirm + cancel — use window.confirm
    const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
    if (confirmed && actionButtons[0]?.onPress) {
      actionButtons[0].onPress();
    } else if (!confirmed && cancelButton?.onPress) {
      cancelButton.onPress();
    }
    return;
  }

  // Multiple action buttons or no cancel — show alert and call first action
  const text = message ? `${title}\n\n${message}` : title;
  window.alert(text);
  if (actionButtons[0]?.onPress) {
    actionButtons[0].onPress();
  }
}
