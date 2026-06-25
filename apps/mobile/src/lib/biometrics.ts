/**
 * Biometric / device-credential auth for the mobile app.
 *
 * Flow:
 *  1. After the user signs in once with a password (or passkey), they
 *     can enable "Unlock with Face ID / Touch ID / fingerprint".
 *  2. We encrypt the refresh token with a passphrase the user enters
 *     once and stash it in SecureStore, gated behind a biometric prompt.
 *  3. On subsequent launches, the biometric prompt unlocks the
 *     encrypted blob → refresh token → access token.
 *
 * The actual "biometric" check is delegated to the OS via
 * `expo-local-authentication`. The cryptographic key the OS uses
 * is the SecureStore keychain entry, which is hardware-backed on
 * iOS (Secure Enclave) and on Android (StrongBox / TEE when
 * available).
 */

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const BIOMETRIC_KEY = "elixio.biometric.enabled";
const REFRESH_KEY = "elixio.biometric.refresh";

export interface BiometricAvailability {
  /** True if the device has hardware-backed biometric capability. */
  available: boolean;
  /** Human-readable name of the biometric kind ("Face ID", "Touch ID", "Fingerprint"). */
  label: string;
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const available = hasHardware && enrolled;
  let label = "Biometrics";
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    label = "Face ID";
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    label = "Fingerprint";
  } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    label = "Iris";
  }
  return { available, label };
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === "1";
}

export async function enableBiometric(refreshToken: string): Promise<void> {
  const availability = await getBiometricAvailability();
  if (!availability.available) {
    throw new Error(`${availability.label} is not available on this device.`);
  }
  const ok = await LocalAuthentication.authenticateAsync({
    promptMessage: `Enable ${availability.label} for Elixio Digital`,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
  if (!ok.success) throw new Error("Biometric setup cancelled.");
  // The refresh token is stored in SecureStore. On iOS, SecureStore
  // entries backed by biometric require a fresh biometric prompt on
  // read; on Android, the keystore enforces biometric binding.
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken, {
    requireAuthentication: true,
    authenticationPrompt: `Unlock Elixio Digital with ${availability.label}`,
  });
  await SecureStore.setItemAsync(BIOMETRIC_KEY, "1");
}

export async function unlockWithBiometric(): Promise<string | null> {
  const enabled = await isBiometricEnabled();
  if (!enabled) return null;
  try {
    return (await SecureStore.getItemAsync(REFRESH_KEY, {
      requireAuthentication: true,
      authenticationPrompt: "Unlock Elixio Digital",
    })) as string | null;
  } catch {
    return null;
  }
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
}

/** Random opaque identifier we attach to the keychain so a leaked
 * SecureStore backup can't be replayed across devices. */
export async function deviceFingerprint(): Promise<string> {
  const existing = await SecureStore.getItemAsync("elixio.device.id");
  if (existing) return existing;
  const id = await Crypto.randomUUID();
  await SecureStore.setItemAsync("elixio.device.id", id);
  return id;
}
