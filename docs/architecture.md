# Architecture --- Aplikasi Chatting Online

> Dokumentasi arsitektur aplikasi chatting berbasis **HTML / CSS /
> JavaScript + Supabase + WebRTC**.

------------------------------------------------------------------------

## 1. Gambaran Umum

Aplikasi terdiri dari dua browser/client yang berkomunikasi dengan
layanan Supabase untuk kebutuhan autentikasi, database, chat realtime,
presence, signaling WebRTC, dan penyimpanan file.

Untuk komunikasi audio/video secara langsung, aplikasi menggunakan
**WebRTC P2P** sehingga media dapat mengalir langsung antara Browser A
dan Browser B apabila koneksi memungkinkan.

``` text
                         ┌──────────────────────────────┐
                         │          SUPABASE            │
                         │                              │
                         │  ┌────────────────────────┐  │
                         │  │ Auth                   │  │
                         │  │ Email + Google OAuth   │  │
                         │  └────────────────────────┘  │
                         │                              │
                         │  ┌────────────────────────┐  │
                         │  │ Realtime               │  │
                         │  │ • Chat                 │  │
                         │  │ • Presence             │  │
                         │  │ • WebRTC Signaling     │  │
                         │  └────────────────────────┘  │
                         │                              │
                         │  ┌────────────────────────┐  │
                         │  │ Storage                │  │
                         │  │ Foto / Video / File    │  │
                         │  └────────────────────────┘  │
                         │                              │
                         │  ┌────────────────────────┐  │
                         │  │ Edge Functions         │  │
                         │  │ Optional / Nanti       │  │
                         │  └────────────────────────┘  │
                         └──────────────┬───────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       │                                 │
                       ▼                                 ▼
          ┌──────────────────────┐          ┌──────────────────────┐
          │     PostgreSQL       │          │    Storage Bucket    │
          │       + RLS          │          │ Foto / Video / File  │
          └──────────────────────┘          └──────────────────────┘
```

------------------------------------------------------------------------

## 2. Client / Browser

Aplikasi frontend berjalan di browser menggunakan:

-   **HTML** --- struktur halaman
-   **CSS** --- tampilan dan layout
-   **JavaScript** --- logika aplikasi
-   **WebRTC API** --- audio/video/data P2P
-   **Supabase JavaScript Client** --- komunikasi dengan Supabase

Terdapat dua client utama:

``` text
┌──────────────────────┐
│      Browser A       │
│                      │
│   HTML / CSS / JS    │
└──────────┬───────────┘
           │
           │ HTTPS / WSS
           │
           ▼
       Supabase
```

``` text
┌──────────────────────┐
│      Browser B       │
│                      │
│   HTML / CSS / JS    │
└──────────┬───────────┘
           │
           │ HTTPS / WSS
           │
           ▼
       Supabase
```

------------------------------------------------------------------------

## 3. Supabase

Supabase menjadi backend utama aplikasi.

### 3.1 Supabase Auth

Digunakan untuk:

-   Registrasi akun
-   Login
-   Logout
-   Session management
-   Login menggunakan email
-   Login menggunakan Google OAuth

``` text
Browser
   │
   ▼
Supabase Auth
   │
   ├── Email
   └── Google OAuth
```

------------------------------------------------------------------------

### 3.2 Supabase Realtime

Digunakan untuk komunikasi realtime tanpa perlu membuat server WebSocket
sendiri.

Fungsi utama:

-   Chat realtime
-   Presence / status online
-   WebRTC signaling
-   Pertukaran informasi koneksi antar client

Untuk signaling panggilan WebRTC digunakan channel:

``` text
calls:{id}
```

Contoh:

``` text
calls:12345
```

Channel tersebut digunakan untuk bertukar:

-   SDP Offer
-   SDP Answer
-   ICE Candidates

> **Catatan:** Supabase Realtime hanya digunakan sebagai jalur
> signaling. Audio/video WebRTC tidak dikirim melalui Supabase Realtime.

------------------------------------------------------------------------

### 3.3 Supabase Storage

Digunakan untuk menyimpan file yang dikirim pengguna.

Contoh:

``` text
Storage
├── Foto
├── Video
├── Dokumen
└── File lainnya
```

Alur sederhananya:

``` text
Browser
   │
   │ Upload
   ▼
Supabase Storage
   │
   └── File / Media
```

------------------------------------------------------------------------

### 3.4 PostgreSQL + Row Level Security

Supabase menggunakan PostgreSQL sebagai database utama.

Database digunakan untuk menyimpan data seperti:

-   Profil pengguna
-   Data user
-   Percakapan
-   Pesan
-   Relasi pertemanan / kontak
-   Metadata file
-   Data lain yang diperlukan aplikasi

Keamanan database menggunakan:

**Row Level Security (RLS)**

``` text
Browser
   │
   ▼
Supabase API
   │
   ▼
PostgreSQL
   │
   └── RLS
```

RLS digunakan agar pengguna hanya dapat mengakses data yang memang
diizinkan untuknya.

------------------------------------------------------------------------

### 3.5 Edge Functions

**Supabase Edge Functions** bersifat opsional dan dapat ditambahkan
ketika aplikasi membutuhkan proses backend khusus.

Contoh penggunaan di masa depan:

-   Proses yang tidak boleh dilakukan langsung di browser
-   Validasi tertentu
-   Integrasi API eksternal
-   Proses server-side
-   Operasi yang membutuhkan secret key

Untuk tahap awal, Edge Functions belum wajib digunakan.

------------------------------------------------------------------------

# 4. Arsitektur WebRTC

WebRTC digunakan untuk komunikasi langsung antara Browser A dan Browser
B.

``` text
┌──────────────────────┐
│      Browser A       │
└──────────┬───────────┘
           │
           │
           │ WebRTC P2P
           │
           ▼
┌──────────────────────┐
│      Browser B       │
└──────────────────────┘
```

Media/data yang dapat dikirim melalui WebRTC:

``` text
Browser A ◄──────────── WebRTC P2P ────────────► Browser B
                           │
                           ├── Audio
                           ├── Video
                           └── Data Channel
```

Contoh fitur yang dapat menggunakan WebRTC:

-   Voice Call
-   Video Call
-   Screen Sharing
-   Data Channel

------------------------------------------------------------------------

# 5. WebRTC Signaling

WebRTC membutuhkan signaling untuk membantu kedua browser bertukar
informasi sebelum koneksi P2P terbentuk.

Dalam aplikasi ini, signaling menggunakan:

**Supabase Realtime**

Channel:

``` text
calls:{id}
```

Arsitekturnya:

``` text
Browser A
    │
    │ Signaling
    ▼
Supabase Realtime
    │
    │ Signaling
    ▼
Browser B
```

Supabase Realtime hanya membantu pertukaran informasi koneksi.

Setelah koneksi WebRTC berhasil, komunikasi media dapat berlangsung
langsung:

``` text
Browser A
    │
    │
    │  WebRTC P2P
    │
    ▼
Browser B
```

------------------------------------------------------------------------

# 6. Proses Signaling WebRTC

Urutan umum pembentukan koneksi:

``` text
Browser A                         Browser B
    │                                 │
    │  1. Create Offer                │
    │                                 │
    │──── SDP Offer ─────────────────►│
    │       via Realtime              │
    │                                 │
    │                         2. Create Answer
    │                                 │
    │◄─── SDP Answer ────────────────│
    │       via Realtime              │
    │                                 │
    │──── ICE Candidate ─────────────►│
    │                                 │
    │◄─── ICE Candidate ─────────────│
    │                                 │
    │                                 │
    └──────── WebRTC P2P ─────────────┘
```

### Data yang dipertukarkan

#### SDP Offer

Dibuat oleh pihak yang memulai panggilan.

``` text
Browser A
   │
   └── SDP Offer
```

#### SDP Answer

Dibuat oleh pihak penerima panggilan.

``` text
Browser B
   │
   └── SDP Answer
```

#### ICE Candidates

Digunakan untuk membantu kedua browser menemukan jalur jaringan yang
dapat digunakan.

``` text
Browser A ◄──── ICE Candidates ────► Browser B
```

------------------------------------------------------------------------

# 7. STUN Server

Untuk membantu menemukan jalur koneksi P2P, WebRTC dapat menggunakan
STUN.

STUN yang digunakan pada tahap awal:

``` text
stun.l.google.com:19302
```

Konfigurasi konsep:

``` text
WebRTC
   │
   ▼
STUN
   │
   └── stun.l.google.com:19302
```

STUN digunakan untuk membantu browser mengetahui alamat jaringan publik
yang dapat digunakan dalam proses ICE.

> STUN bukan server yang meneruskan audio/video. STUN membantu proses
> penemuan jalur koneksi.

------------------------------------------------------------------------

# 8. TURN Server

Dalam beberapa kondisi, koneksi P2P langsung dapat gagal, misalnya
karena NAT atau firewall yang ketat.

Jika koneksi langsung tidak memungkinkan, TURN dapat digunakan sebagai
relay.

``` text
Normal:

Browser A ◄──────── P2P ────────► Browser B


Jika P2P tidak memungkinkan:

Browser A ─────► TURN Server ─────► Browser B
```

Pada tahap awal:

``` text
TURN Server
└── Belum digunakan
```

TURN dapat ditambahkan kemudian ketika aplikasi sudah membutuhkan
dukungan koneksi yang lebih luas.

------------------------------------------------------------------------

# 9. Alur Chat

Chat biasa tidak membutuhkan WebRTC.

Pesan chat dapat menggunakan Supabase Realtime dan PostgreSQL.

``` text
Browser A
    │
    │ Kirim pesan
    ▼
Supabase
    │
    ├── PostgreSQL
    │      └── Simpan pesan
    │
    └── Realtime
           │
           ▼
       Browser B
```

Contoh:

``` text
Browser A
   │
   │ "Halo"
   ▼
Supabase Realtime
   │
   ▼
Browser B
```

Database tetap menjadi sumber data permanen untuk riwayat chat.

------------------------------------------------------------------------

# 10. Alur Presence

Presence digunakan untuk mengetahui status pengguna secara realtime.

Contoh status:

``` text
Online
Offline
Typing
Idle
```

Konsep:

``` text
Browser A
    │
    │ Presence
    ▼
Supabase Realtime
    │
    ▼
Browser B
```

Contoh:

``` text
User A = Online
User B = Online
```

------------------------------------------------------------------------

# 11. Alur Upload File

Untuk foto, video, dan file:

``` text
Browser
    │
    │ Upload
    ▼
Supabase Storage
    │
    ▼
Storage Bucket
```

Metadata file dapat disimpan di PostgreSQL.

``` text
Storage
└── File asli

PostgreSQL
└── Metadata file
    ├── file_id
    ├── user_id
    ├── nama_file
    ├── ukuran
    └── lokasi/path
```

------------------------------------------------------------------------

# 12. Arsitektur Keseluruhan

``` text
                         ┌──────────────────────────┐
                         │        BROWSER A         │
                         │     HTML / CSS / JS      │
                         └────────────┬─────────────┘
                                      │
                                      │ HTTPS / WSS
                                      ▼
                         ┌──────────────────────────┐
                         │         SUPABASE         │
                         │                          │
                         │  ┌────────────────────┐  │
                         │  │ Auth               │  │
                         │  │ Email / Google     │  │
                         │  └────────────────────┘  │
                         │                          │
                         │  ┌────────────────────┐  │
                         │  │ Realtime           │  │
                         │  │ Chat               │  │
                         │  │ Presence           │  │
                         │  │ WebRTC Signaling   │  │
                         │  └────────────────────┘  │
                         │                          │
                         │  ┌────────────────────┐  │
                         │  │ Storage            │  │
                         │  │ Foto/Video/File    │  │
                         │  └────────────────────┘  │
                         │                          │
                         │  ┌────────────────────┐  │
                         │  │ Edge Functions     │  │
                         │  │ Optional / Nanti   │  │
                         │  └────────────────────┘  │
                         └───────────┬──────────────┘
                                     │
                         ┌───────────┴────────────┐
                         ▼                        ▼
                 ┌───────────────┐       ┌────────────────┐
                 │  PostgreSQL   │       │    Storage     │
                 │      + RLS    │       │    Bucket      │
                 └───────────────┘       └────────────────┘


                         ┌──────────────────────────┐
                         │        BROWSER B         │
                         │     HTML / CSS / JS      │
                         └────────────┬─────────────┘
                                      │
                                      │ HTTPS / WSS
                                      ▼
                                   Supabase


              ┌──────────────────────────────────────────┐
              │             WEBRTC P2P                   │
              │                                          │
              │ Browser A ◄────────────────► Browser B   │
              │                                          │
              │        Audio / Video / Data              │
              └──────────────────────────────────────────┘
                              ▲
                              │
                         Signaling
                              │
                              ▼
                    Supabase Realtime
                         calls:{id}


                    ┌────────────────────┐
                    │      STUN          │
                    │                    │
                    │ stun.l.google.com  │
                    │       :19302       │
                    └────────────────────┘
                              │
                              ▼
                     Membantu koneksi P2P


                    ┌────────────────────┐
                    │      TURN          │
                    │                    │
                    │    Ditambahkan     │
                    │      nanti        │
                    └────────────────────┘
                              │
                              ▼
                       Relay jika P2P
                     tidak memungkinkan
```

------------------------------------------------------------------------

# 13. Ringkasan Tanggung Jawab Komponen

  Komponen            Fungsi
  ------------------- --------------------------------------------------
  Browser             Menjalankan frontend aplikasi
  HTML                Struktur halaman
  CSS                 Tampilan dan layout
  JavaScript          Logika aplikasi
  Supabase Auth       Registrasi, login, session
  Google OAuth        Login menggunakan Google
  Supabase Realtime   Chat realtime, presence, signaling
  PostgreSQL          Database aplikasi
  RLS                 Membatasi akses data berdasarkan aturan keamanan
  Storage             Menyimpan foto, video, dan file
  Edge Functions      Backend/server-side tambahan jika diperlukan
  WebRTC              Komunikasi audio/video/data P2P
  STUN                Membantu menemukan jalur koneksi P2P
  TURN                Relay ketika koneksi P2P langsung gagal

------------------------------------------------------------------------

# 14. Prinsip Arsitektur

Arsitektur aplikasi ini menggunakan prinsip:

``` text
Frontend
HTML + CSS + JavaScript
        │
        ▼
Supabase
        │
        ├── Authentication
        ├── Realtime
        ├── Database
        └── Storage

WebRTC
        │
        └── Browser A ◄──── P2P ────► Browser B
```

Dengan pembagian tanggung jawab:

-   **Supabase** menangani data, autentikasi, chat realtime, presence,
    signaling, dan penyimpanan file.
-   **PostgreSQL + RLS** menangani penyimpanan serta keamanan akses
    data.
-   **WebRTC** menangani komunikasi audio/video/data secara P2P.
-   **STUN** membantu proses pembentukan koneksi WebRTC.
-   **TURN** disiapkan sebagai fallback ketika koneksi P2P tidak dapat
    terbentuk.
-   **Edge Functions** dapat ditambahkan jika aplikasi membutuhkan
    proses backend khusus.

------------------------------------------------------------------------

# 15. Status Implementasi

Bagian ini dapat diperbarui selama proses pengembangan.

``` text
[ ] Struktur frontend
[ ] Supabase project
[ ] Supabase Auth
[ ] Email authentication
[ ] Google OAuth
[ ] Database PostgreSQL
[ ] RLS policies
[ ] Chat realtime
[ ] Presence
[ ] Storage upload
[ ] WebRTC signaling
[ ] Voice call
[ ] Video call
[ ] Screen sharing
[ ] STUN
[ ] TURN
[ ] Edge Functions
[ ] Deployment website
```

------------------------------------------------------------------------

## 16. Catatan Pengembangan

Dokumen ini merupakan **arsitektur awal**. Struktur dapat berubah ketika
fitur aplikasi bertambah.

Perubahan arsitektur sebaiknya dicatat di file ini agar dokumentasi
selalu mengikuti implementasi aplikasi.
