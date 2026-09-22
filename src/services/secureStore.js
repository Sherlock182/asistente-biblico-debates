import * as SecureStore from 'expo-secure-store';

const GROQ_KEY = 'groq_api_key';

export async function getGroqApiKey() {
  return SecureStore.getItemAsync(GROQ_KEY);
}

export async function setGroqApiKey(key) {
  if (!key) {
    return SecureStore.deleteItemAsync(GROQ_KEY);
  }
  return SecureStore.setItemAsync(GROQ_KEY, key);
}
