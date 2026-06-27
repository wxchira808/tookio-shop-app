import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const memoryStore = new Map();

const getWebStorage = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

export async function getStorageItem(key) {
  if (Platform.OS !== "web") {
    return SecureStore.getItemAsync(key);
  }

  const storage = getWebStorage();
  return storage ? storage.getItem(key) : memoryStore.get(key) || null;
}

export async function setStorageItem(key, value) {
  if (Platform.OS !== "web") {
    return SecureStore.setItemAsync(key, value);
  }

  const storage = getWebStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }

  memoryStore.set(key, value);
}

export async function deleteStorageItem(key) {
  if (Platform.OS !== "web") {
    return SecureStore.deleteItemAsync(key);
  }

  const storage = getWebStorage();
  if (storage) {
    storage.removeItem(key);
    return;
  }

  memoryStore.delete(key);
}

export async function getJsonStorageItem(key) {
  const value = await getStorageItem(key);
  return value ? JSON.parse(value) : null;
}

export async function setJsonStorageItem(key, value) {
  await setStorageItem(key, JSON.stringify(value));
}
