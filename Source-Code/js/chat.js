import { supabase } from "./supabase.js";

import {
  subscribeMessages,
  unsubscribeMessages
} from "./realtime.js";


let renderedIds = new Set();


/* =========================================================
   FORMAT WAKTU
   ========================================================= */

function formatTime(dateString) {
  return new Date(
    dateString
  ).toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


/* =========================================================
   RENDER MESSAGE
   ========================================================= */

function renderMessage(
  message,
  isMe
) {
  const messageList =
    document.getElementById(
      "messageList"
    );

  if (!messageList) {
    return;
  }


  const empty =
    document.getElementById(
      "emptyMsgState"
    );

  if (empty) {
    empty.remove();
  }


  const bubble =
    document.createElement(
      "div"
    );

  bubble.className =
    `message-bubble ${
      isMe
        ? "message-me"
        : "message-other"
    }`;

  bubble.dataset.id =
    message.id;


  const content =
    document.createElement(
      "div"
    );

  content.className =
    "message-content";

  content.textContent =
    message.deleted_at
      ? "Pesan telah dihapus."
      : (
          message.type === "text"
            ? message.content || ""
            : `[${message.type}] ${
                message.content || ""
              }`
        );


  const time =
    document.createElement(
      "div"
    );

  time.className =
    "message-time";

  time.textContent =
    formatTime(
      message.created_at
    );


  bubble.appendChild(
    content
  );

  bubble.appendChild(
    time
  );

  messageList.appendChild(
    bubble
  );


  messageList.scrollTop =
    messageList.scrollHeight;
}


/* =========================================================
   6A - LOAD CONVERSATIONS
   ========================================================= */

export async function loadConversations() {
  unsubscribeMessages();


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
          avatar_url
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


  const ids =
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
        ids
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


  const lastMap =
    new Map();


  (lastMessages || [])
    .forEach(
      (message) => {
        if (
          !lastMap.has(
            message.conversation_id
          )
        ) {
          lastMap.set(
            message.conversation_id,
            message
          );
        }
      }
    );


  list.innerHTML =
    conversations
      .map(
        (conversation) => {

          const last =
            lastMap.get(
              conversation.id
            );


          const preview =
            last
              ? (
                  last.type !== "text"
                    ? `[${last.type}] `
                    : ""
                ) +
                (
                  last.content ||
                  ""
                )
              : "Belum ada pesan";


          const time =
            last
              ? formatTime(
                  last.created_at
                )
              : "";


          const name =
            conversation.name ||
            "Private Chat";


          return `
            <a
              href="./chat.html?id=${encodeURIComponent(
                conversation.id
              )}"
              class="list-item"
            >

              <div class="avatar"></div>

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
                  ${name}
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
                  ${preview}
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
                ${time}
              </div>

            </a>
          `;
        }
      )
      .join("");
}


/* =========================================================
   6B + 6D-2B - LOAD MESSAGES
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


  if (
    sessionError ||
    !session
  ) {
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
      "Kamu tidak memiliki akses ke chat ini."
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
    "flex";


  /* =========================
     CONVERSATION INFO
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


  if (
    conversationError
  ) {
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
     RESET MESSAGE STATE
     ========================= */

  renderedIds =
    new Set();


  messageList.innerHTML = `
    <div
      id="emptyMsgState"
      class="chat-empty"
    >
      Memuat...
    </div>
  `;


  /* =========================
     SUBSCRIBE FIRST
     ========================= */

  subscribeMessages(
    convId,
    renderedIds,
    (message) => {

      renderMessage(
        message,
        message.sender_id === uid
      );

    }
  );


  /* =========================
     INITIAL MESSAGE FETCH
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

    messageList.innerHTML = `
      <div
        class="chat-empty"
      >
        ${messagesError.message}
      </div>
    `;

    return;
  }


  /* =========================
     REMOVE LOADING
     HANYA JIKA MASIH ADA
     ========================= */

  const loadingMessage =
    document.getElementById(
      "emptyMsgState"
    );

  if (loadingMessage) {
    loadingMessage.remove();
  }


  /* =========================
     RENDER INITIAL MESSAGES
     ========================= */

  if (
    !messages ||
    messages.length === 0
  ) {

    if (
      renderedIds.size === 0
    ) {

      messageList.innerHTML = `
        <div
          id="emptyMsgState"
          class="chat-empty"
        >
          Belum ada pesan.
        </div>
      `;

    }

  } else {

    messages.forEach(
      (message) => {

        if (
          renderedIds.has(
            message.id
          )
        ) {
          return;
        }

        renderedIds.add(
          message.id
        );

        renderMessage(
          message,
          message.sender_id === uid
        );

      }
    );

  }


  messageList.scrollTop =
    messageList.scrollHeight;
}


/* =========================================================
   6C - SEND MESSAGE
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


  if (
    sessionError ||
    !session
  ) {

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
     MEMBERSHIP
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
      "Kamu tidak memiliki akses ke chat ini."
    );

    return {
      success: false,
      error: "Access denied."
    };
  }


  /* =========================
     INSERT
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
      .select(`
        id,
        sender_id,
        type,
        content,
        created_at
      `)
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
     LOCAL RENDER
     ========================= */

  if (
    !renderedIds.has(
      data.id
    )
  ) {

    renderedIds.add(
      data.id
    );

    renderMessage(
      data,
      true
    );

  }


  return {
    success: true,
    data
  };
}