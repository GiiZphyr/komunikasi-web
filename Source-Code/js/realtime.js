import { supabase } from "./supabase.js";

let activeChannel = null;
let activeConvId = null;

let retryCount = 0;
let retryTimer = null;

let subscriptionToken = 0;

const MAX_RETRY = 3;
const DELAYS = [2000, 4000, 8000];

/* =========================================================
   INTERNAL SUBSCRIBE
   ========================================================= */

function doSubscribe(
  convId,
  renderedIds,
  onInsert,
  onStatus
) {
  const currentToken = ++subscriptionToken;

  const channel = supabase
    .channel(`conv:${convId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${convId}`
      },
      (payload) => {
        const message = payload.new;

        if (!message?.id) {
          return;
        }

        // Cegah duplicate message.
        if (renderedIds.has(message.id)) {
          return;
        }

        renderedIds.add(message.id);

        onInsert(message);
      }
    )
    .subscribe((status) => {
      // Abaikan callback dari subscription lama.
      if (
        currentToken !== subscriptionToken ||
        activeConvId !== convId
      ) {
        return;
      }

      console.log(
        `Realtime [${convId}]: ${status}`
      );

      if (onStatus) {
        onStatus(status, retryCount);
      }

      /* =====================================================
         SUBSCRIBED
         ===================================================== */

      if (status === "SUBSCRIBED") {
        retryCount = 0;

        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }

        return;
      }

      /* =====================================================
         ERROR / TIMEOUT
         ===================================================== */

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT"
      ) {
        if (activeConvId !== convId) {
          return;
        }

        if (retryTimer) {
          return;
        }

        if (retryCount >= MAX_RETRY) {
          console.log(
            `Realtime [${convId}]: retry habis`
          );

          if (onStatus) {
            onStatus("CLOSED", retryCount);
          }

          return;
        }

        const delay =
          DELAYS[retryCount] || DELAYS[DELAYS.length - 1];

        retryCount++;

        if (onStatus) {
          onStatus(
            "RECONNECTING",
            retryCount
          );
        }

        console.log(
          `Realtime [${convId}]: reconnect ${retryCount}/${MAX_RETRY} dalam ${delay}ms`
        );

        retryTimer = setTimeout(() => {
          retryTimer = null;

          // Jangan reconnect jika conversation
          // sudah berubah / sudah ditutup.
          if (
            activeConvId !== convId ||
            currentToken !== subscriptionToken
          ) {
            return;
          }

          if (activeChannel) {
            supabase.removeChannel(
              activeChannel
            );

            activeChannel = null;
          }

          doSubscribe(
            convId,
            renderedIds,
            onInsert,
            onStatus
          );
        }, delay);

        return;
      }

      /* =====================================================
         CLOSED
         ===================================================== */

      if (status === "CLOSED") {
        if (onStatus) {
          onStatus(
            "CLOSED",
            retryCount
          );
        }
      }
    });

  activeChannel = channel;

  return channel;
}

/* =========================================================
   SUBSCRIBE MESSAGES
   ========================================================= */

export function subscribeMessages(
  convId,
  renderedIds,
  onInsert,
  onStatus
) {
  // Jangan membuat subscription kedua
  // untuk conversation yang sama.
  if (
    activeChannel &&
    activeConvId === convId
  ) {
    return activeChannel;
  }

  // Bersihkan subscription lama.
  unsubscribeMessages();

  activeConvId = convId;
  retryCount = 0;

  if (onStatus) {
    onStatus("RECONNECTING", 0);
  }

  return doSubscribe(
    convId,
    renderedIds,
    onInsert,
    onStatus
  );
}

/* =========================================================
   UNSUBSCRIBE
   ========================================================= */

export function unsubscribeMessages() {
  // Batalkan retry timer.
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  // Invalidasi callback subscription lama.
  subscriptionToken++;

  // Hapus channel aktif.
  if (activeChannel) {
    supabase.removeChannel(
      activeChannel
    );

    activeChannel = null;
  }

  activeConvId = null;
  retryCount = 0;
}

/* =========================================================
   GET ACTIVE CONVERSATION
   ========================================================= */

export function getActiveConvId() {
  return activeConvId;
}