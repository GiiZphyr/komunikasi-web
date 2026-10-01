import { supabase } from "./supabase.js";

let activeChannel = null;
let activeConvId = null;

export function subscribeMessages(
  convId,
  renderedIds,
  onInsert
) {
  // Jangan membuat subscription kedua
  // untuk conversation yang sama.
  if (
    activeChannel &&
    activeConvId === convId
  ) {
    return activeChannel;
  }

  // Bersihkan channel lama.
  unsubscribeMessages();

  activeConvId = convId;

  activeChannel = supabase
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
      console.log(
        `Realtime [${convId}]: ${status}`
      );
    });

  return activeChannel;
}

export function unsubscribeMessages() {
  if (!activeChannel) {
    activeConvId = null;
    return;
  }

  supabase.removeChannel(
    activeChannel
  );

  activeChannel = null;
  activeConvId = null;
}

export function getActiveConvId() {
  return activeConvId;
}