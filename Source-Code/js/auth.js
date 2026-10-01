// PHASE 4: isi logic authentication.

import { supabase } from "./supabase.js";

const APP_ROOT = new URL("../", import.meta.url);

export async function signUp(email, password) {
  const redirectUrl =
    new URL("index.html", window.location.href).href;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl
    }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("Cek email untuk verifikasi akun.");
  }

  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  } else {
    location.href = new URL("pages/chat.html", APP_ROOT).href;
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  location.href = new URL("login.html", APP_ROOT).href;
}

export async function checkSession(requireAuth = true) {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (requireAuth && !session) {
    location.href = new URL("login.html", APP_ROOT).href;
    return null;
  }

  if (!requireAuth && session) {
    location.href = new URL("pages/chat.html", APP_ROOT).href;
    return session;
  }

  return session;
}