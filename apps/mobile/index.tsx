import ExceptionsManager from 'react-native/Libraries/Core/ExceptionsManager';

if (__DEV__) {
  ExceptionsManager.handleException = (error, isFatal) => {
    // no-op
  };
}

import 'react-native-url-polyfill/auto';
import './src/__create/polyfills';
global.Buffer = require('buffer').Buffer;

import 'expo-router/entry';
import { SplashScreen } from 'expo-router';
import { App } from 'expo-router/build/qualified-entry';
import { type ReactNode, memo, useEffect } from 'react';
import { AppRegistry, LogBox, SafeAreaView, Text, View } from 'react-native';
import { serializeError } from 'serialize-error';
import { DeviceErrorBoundaryWrapper } from './__create/DeviceErrorBoundary';
import { ErrorBoundaryWrapper, SharedErrorBoundary } from './__create/SharedErrorBoundary';

if (__DEV__) {
  LogBox.ignoreAllLogs();
  LogBox.uninstall();
  try {
    function WrapperComponentProvider({
      children,
    }: {
      children: ReactNode;
    }) {
      return <DeviceErrorBoundaryWrapper>{children}</DeviceErrorBoundaryWrapper>;
    }

    AppRegistry.setWrapperComponentProvider(() => WrapperComponentProvider);
    AppRegistry.registerComponent('main', () => App);
  } catch (error) {
    console.warn('Error setting up error boundary:', error);
    // Fallback without error boundary
    AppRegistry.registerComponent('main', () => App);
  }
}
