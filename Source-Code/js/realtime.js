import { supabase } from "./supabase.js";

let activeChannel = null;

export function subscribeMessages(
  convId,
  renderedIds,
  onInsert
) {
  unsubscribeMessages();

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

        if (renderedIds.has(message.id)) {
          return;
        }

        renderedIds.add(message.id);

        onInsert(message);
      }
    )
    .subscribe((status) => {
      console.log(
        `Realtime [${convId}]:`,
        status
      );
    });

  return activeChannel;
}

export function unsubscribeMessages() {
  if (!activeChannel) {
    return;
  }

  supabase.removeChannel(activeChannel);
  activeChannel = null;
}