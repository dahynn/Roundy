# Roudy Demonstration Scenario

## 1. Introduction & Access
**Goal**: Access the landing page and log in to the service.

1.  **Open Browser**: Navigate to the provided service URL.
2.  **Landing Page**:
    -   Observe the "Roudy" branding and introductory animations.
    -   **Click**: "Login with Kakao" (or "Start") button.
3.  **Kakao Login**:
    -   Enter Kakao credentials (or auto-login if session exists).
    -   Agree to permissions if prompted.
4.  **Redirection**:
    -   User is redirected back to the `AuthCallback` page.
    -   System processes the token and redirects to **Main Home**.

## 2. Main Dashboard & Profile (My Page)
**Goal**: Verify user identity and set up preferences.

1.  **Main Home (`/home`)**:
    -   Observe the main dashboard layout.
    -   **Click**: "My Page" or Profile Icon.
2.  **My Page (`/mypage`)**:
    -   **Action**: Update Profile Information (Nickname, Introduction).
    -   **Click**: "Edit Preferences" (`/mypage/preferences`).
3.  **Preferences**:
    -   **Action**: Select preferences for:
        -   Start of Relationship (Relationship Goal)
        -   Dating Style
        -   Date Preference
        -   Personality
        -   Appearance
        -   Talent
    -   **Click**: "Save" to persist changes.

## 3. Matching Process
**Goal**: Enter the matching queue and find a partner.

1.  **Return directly to Home**.
2.  **Start Matching**:
    -   **Click**: "Start Matching" (or "Find Match") button on the Home screen.
3.  **Waiting Lobby (`/loading`)**:
    -   Observe the "Searching for partner..." animation.
    -   System connects to WebSocket and waits for the matching algorithm to pair users.
4.  **Match Found**:
    -   When a match is found, the screen transitions automatically to the **Meeting Room**.

## 4. The Blind Meeting (Rotation)
**Goal**: Experience the core video rotation feature.

1.  **Meeting Room (`/meeting`)**:
    -   **Initial State**: Camera might be blurred or masked (Blind concept) if applicable, or standard video.
    -   **Permissions**: Allow Camera/Microphone access in the browser.
2.  **Rotation Logic**:
    -   Observe the timer counting down for the current round.
    -   **Action**: Engage in conversation via video (OpenVidu WebRTC).
    -   **Feature**: Notice the "Topic Suggestion" or connection indicators.
3.  **Partner Switch (If Rotation Mode)**:
    -   When the timer ends, the system may automatically switch to the next partner (if in a multi-user rotation scenario).
    -   *Note*: If 1:1 matching, the session continues until a mutual decision is made or time expires.

## 5. Final Selection & Messaging
**Goal**: Confirm a match and chat.

1.  **Decision Phase**:
    -   At the end of the meeting/rotation, a selection screen appears.
    -   **Click**: "Like" or "Pass" (or "Request Chat").
2.  **Match Result**:
    -   If mutual "Like", a "Match Success" screen appears.
3.  **Messaging (`/messages`)**:
    -   **Click**: "Go to Messages" or navigate to the Message List.
    -   **Action**: Click on the new match's chat room.
    -   **Chat Room (`/messages/:id`)**: Send a text message to confirm real-time chat functionality.
