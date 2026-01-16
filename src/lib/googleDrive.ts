"use client";

export const GOOGLE_CLIENT_ID = "1009498436542-3k2h3d5d7mmcrr5kftfmueu5sdt5oqnr.apps.googleusercontent.com";
export const DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.appdata";
export const FILE_NAME = "orbium_data.json";

// PKCE Helpers
export function generateCodeVerifier() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function initiateGoogleAuth() {
  const verifier = generateCodeVerifier();
  localStorage.setItem("google_code_verifier", verifier);

  const challenge = await generateCodeChallenge(verifier);
  // URI exata conforme solicitado
  const redirectUri = window.location.origin + '/oauth/callback';

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", DRIVE_SCOPES);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  window.location.href = authUrl.toString();
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export function saveGoogleToken(tokenData: GoogleTokenResponse) {
  const expiresAt = Date.now() + tokenData.expires_in * 1000;
  localStorage.setItem("google_access_token", tokenData.access_token);
  localStorage.setItem("google_token_expires_at", expiresAt.toString());
}

export function getGoogleToken() {
  const token = localStorage.getItem("google_access_token");
  const expiresAt = localStorage.getItem("google_token_expires_at");

  if (!token || !expiresAt) return null;
  if (Date.now() > parseInt(expiresAt)) {
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("google_token_expires_at");
    return null;
  }
  return token;
}

export function logoutGoogleDrive() {
  localStorage.removeItem("google_access_token");
  localStorage.removeItem("google_token_expires_at");
  localStorage.removeItem("google_last_sync");
}