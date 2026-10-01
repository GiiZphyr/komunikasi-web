import { supabase } from "./supabase.js";


/* =========================================================
   HELPER: Escape HTML
   Mencegah isi pesan user dianggap sebagai HTML.
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   HELPER: Format waktu
   ========================================================= */

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   6A - LOAD CONVERSATIONS
   ========================================================= */

export async function loadConversations() {

  const list =
    document.getElementById(
      "conversationList"
    );

  const empty =
    document.getElementById(
      "emptyState"
    );

  const loading =
    document.getElementById(
      "loadingState"
    );


  if (
    !list ||
    !empty ||
    !loading
  ) {
    return;
  }


  /* =========================
     SESSION
     ========================= */

  const {
    data: {
      session
    },
    error: sessionError
  } =
    await supabase.auth.getSession();


  if (sessionError) {

    loading.textContent =
      "Session error: " +
      sessionError.message;

    return;

  }


  if (!session) {

    location.href =
      "../login.html";

    return;

  }


  const uid =
    session.user.id;


  /* =========================
     CONVERSATIONS
     ========================= */

  const {
    data: members,
    error
  } =
    await supabase
      .from("conversation_members")
      .select(`
        conversation_id,
        conversations (
          id,
          type,
          name,
          avatar_url,
          created_at
        )
      `)
      .eq(
        "user_id",
        uid
      );


  if (error) {

    loading.textContent =
      "Error: " +
      error.message;

    return;

  }


  const conversations =
    (members || [])
      .map(
        (member) =>
          member.conversations
      )
      .filter(Boolean);


  loading.style.display =
    "none";


  if (
    conversations.length === 0
  ) {

    empty.style.display =
      "block";

    return;

  }


  /* =========================
     LAST MESSAGE
     ========================= */

  const conversationIds =
    conversations.map(
      (conversation) =>
        conversation.id
    );


  const {
    data: lastMessages,
    error: messageError
  } =
    await supabase
      .from("messages")
      .select(`
        conversation_id,
        content,
        created_at,
        type
      `)
      .in(
        "conversation_id",
        conversationIds
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (messageError) {

    loading.textContent =
      "Error: " +
      messageError.message;

    return;

  }


  const lastMessageMap =
    new Map();


  (lastMessages || [])
    .forEach(
      (message) => {

        if (
          !lastMessageMap.has(
            message.conversation_id
          )
        ) {

          lastMessageMap.set(
            message.conversation_id,
            message
          );

        }

      }
    );


  /* =========================
     RENDER LIST
     ========================= */

  list.innerHTML =
    conversations
      .map(
        (conversation) => {

          const lastMessage =
            lastMessageMap.get(
              conversation.id
            );


          const preview =
            lastMessage
              ? (
                  lastMessage.type !==
                  "text"
                    ? `[${lastMessage.type}] `
                    : ""
                ) +
                (
                  lastMessage.content ||
                  ""
                )
              : "Belum ada pesan";


          const time =
            lastMessage
              ? formatTime(
                  lastMessage.created_at
                )
              : "";


          const name =
            conversation.name ||
            "Private Chat";


          const avatar =
            conversation.avatar_url
              ? `
                  <img
                    src="${escapeHTML(
                      conversation.avatar_url
                    )}"
                    alt=""
                    style="
                      width: 100%;
                      height: 100%;
                      object-fit: cover;
                      border-radius: 50%;
                    "
                  >
                `
              : "";


          return `
            <a
              href="./chat.html?id=${encodeURIComponent(
                conversation.id
              )}"
              class="list-item"
            >

              <div class="avatar">
                ${avatar}
              </div>

              <div
                style="
                  min-width: 0;
                  flex: 1;
                "
              >

                <div
                  style="
                    font-weight: 700;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  "
                >
                  ${escapeHTML(name)}
                </div>

                <div
                  style="
                    color: var(--muted);
                    font-size: 13px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  "
                >
                  ${escapeHTML(preview)}
                </div>

              </div>

              <div
                style="
                  margin-left: 8px;
                  font-size: 12px;
                  color: var(--muted);
                  flex-shrink: 0;
                "
              >
                ${escapeHTML(time)}
              </div>

            </a>
          `;

        }
      )
      .join("");
}


/* =========================================================
   6B - LOAD MESSAGES
   ========================================================= */

export async function loadMessages(
  convId
) {

  const listView =
    document.getElementById(
      "list-view"
    );

  const chatView =
    document.getElementById(
      "chat-view"
    );

  const messageList =
    document.getElementById(
      "messageList"
    );

  const chatTitle =
    document.getElementById(
      "chat-title"
    );


  if (
    !listView ||
    !chatView ||
    !messageList
  ) {
    return;

  }


  /* =========================
     SESSION
     ========================= */

  const {
    data: {
      session
    },
    error: sessionError
  } =
    await supabase.auth.getSession();


  if (sessionError) {

    messageList.textContent =
      "Session error: " +
      sessionError.message;

    return;

  }


  if (!session) {

    location.href =
      "../login.html";

    return;

  }


  const uid =
    session.user.id;


  /* =========================
     MEMBERSHIP CHECK
     ========================= */

  const {
    data: member,
    error: memberError
  } =
    await supabase
      .from("conversation_members")
      .select("id")
      .eq(
        "conversation_id",
        convId
      )
      .eq(
        "user_id",
        uid
      )
      .maybeSingle();


  if (memberError) {

    messageList.textContent =
      "Gagal memeriksa akses: " +
      memberError.message;

    return;

  }


  if (!member) {

    alert(
      "Kamu tidak memiliki akses ke percakapan ini."
    );

    location.href =
      "./chat.html";

    return;

  }


  /* =========================
     SHOW CHAT
     ========================= */

  listView.style.display =
    "none";

  chatView.style.display =
    "block";


  /* =========================
     GET CONVERSATION
     ========================= */

  const {
    data: conversation,
    error: conversationError
  } =
    await supabase
      .from("conversations")
      .select(
        "id, type, name"
      )
      .eq(
        "id",
        convId
      )
      .maybeSingle();


  if (conversationError) {

    chatTitle.textContent =
      "Chat";

  } else {

    chatTitle.textContent =
      conversation?.name ||
      (
        conversation?.type === "group"
          ? "Group Chat"
          : "Private Chat"
      );

  }


  /* =========================
     GET MESSAGES
     ========================= */

  const {
    data: messages,
    error: messagesError
  } =
    await supabase
      .from("messages")
      .select(`
        id,
        sender_id,
        type,
        content,
        created_at,
        is_edited,
        deleted_at
      `)
      .eq(
        "conversation_id",
        convId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (messagesError) {

    messageList.textContent =
      "Gagal memuat pesan: " +
      messagesError.message;

    return;

  }


  /* =========================
     EMPTY STATE
     ========================= */

  if (
    !messages ||
    messages.length === 0
  ) {

    messageList.innerHTML = `
      <div class="chat-empty">
        Belum ada pesan.
      </div>
    `;

    return;

  }


  /* =========================
     RENDER MESSAGES
     ========================= */

  messageList.innerHTML =
    messages
      .map(
        (message) => {

          const isMe =
            message.sender_id ===
            uid;


          const content =
            message.deleted_at
              ? "Pesan telah dihapus."
              : (
                  message.type ===
                  "text"
                    ? message.content || ""
                    : `[${message.type}] ${
                        message.content || ""
                      }`
                );


          return `
            <div
              class="
                message-bubble
                ${
                  isMe
                    ? "message-me"
                    : "message-other"
                }
              "
            >

              <div class="message-content">
                ${escapeHTML(content)}
              </div>

              <div class="message-time">
                ${formatTime(
                  message.created_at
                )}

                ${
                  message.is_edited &&
                  !message.deleted_at
                    ? " · diedit"
                    : ""
                }
              </div>

            </div>
          `;

        }
      )
      .join("");


  /* Scroll to newest message */

  messageList.scrollTop =
    messageList.scrollHeight;
}


/* =========================================================
   6C - SEND TEXT MESSAGE
   ========================================================= */

export async function sendMessage(
  convId,
  content
) {

  const cleanContent =
    content.trim();


  if (!cleanContent) {

    return {
      success: false,
      error: "Pesan kosong."
    };

  }


  /* =========================
     SESSION
     ========================= */

  const {
    data: {
      session
    },
    error: sessionError
  } =
    await supabase.auth.getSession();


  if (sessionError) {

    alert(
      "Session error: " +
      sessionError.message
    );

    return {
      success: false,
      error: sessionError
    };

  }


  if (!session) {

    location.href =
      "../login.html";

    return {
      success: false,
      error: "Not authenticated."
    };

  }


  const uid =
    session.user.id;


  /* =========================
     MEMBERSHIP CHECK
     ========================= */

  const {
    data: member,
    error: memberError
  } =
    await supabase
      .from("conversation_members")
      .select("id")
      .eq(
        "conversation_id",
        convId
      )
      .eq(
        "user_id",
        uid
      )
      .maybeSingle();


  if (memberError) {

    alert(
      "Gagal memeriksa akses: " +
      memberError.message
    );

    return {
      success: false,
      error: memberError
    };

  }


  if (!member) {

    alert(
      "Kamu tidak memiliki akses ke percakapan ini."
    );

    return {
      success: false,
      error: "Access denied."
    };

  }


  /* =========================
     INSERT MESSAGE
     ========================= */

  const {
    data,
    error
  } =
    await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_id: uid,
        type: "text",
        content: cleanContent
      })
      .select(
        "id, sender_id, type, content, created_at"
      )
      .single();


  if (error) {

    alert(
      "Gagal mengirim pesan: " +
      error.message
    );

    return {
      success: false,
      error
    };

  }


  /* =========================
     UPDATE UI LOKAL
     ========================= */

  const messageList =
    document.getElementById(
      "messageList"
    );


  if (!messageList) {

    return {
      success: true,
      data
    };

  }


  const emptyState =
    messageList.querySelector(
      ".chat-empty"
    );


  if (emptyState) {
    emptyState.remove();
  }


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "message-bubble message-me";


  const contentDiv =
    document.createElement(
      "div"
    );

  contentDiv.className =
    "message-content";

  contentDiv.textContent =
    data.content;


  const timeDiv =
    document.createElement(
      "div"
    );

  timeDiv.className =
    "message-time";

  timeDiv.textContent =
    formatTime(
      data.created_at
    );


  bubble.appendChild(
    contentDiv
  );

  bubble.appendChild(
    timeDiv
  );

  messageList.appendChild(
    bubble
  );


  messageList.scrollTop =
    messageList.scrollHeight;


  return {
    success: true,
    data
  };
}