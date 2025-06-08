# NIP-29 Group Chat Application

This application implements a public group chat system based on NIP-29 (Relay-based Groups) with NIP-C7 (Chats), NIP-7D (Threads), and NIP-57 (Lightning Zaps) integration.

## Supported Event Kinds

### Standard NIP-29 Events

- **Kind 1**: Text notes/chat messages with `h` tag for group identification (legacy support)
- **Kind 9021**: Join requests to groups
- **Kind 9022**: Leave requests from groups
- **Kind 9000-9020**: Moderation events (admin only)
- **Kind 39000**: Group metadata (relay-generated)
- **Kind 39001**: Group admins list (relay-generated)
- **Kind 39002**: Group members list (relay-generated)
- **Kind 39003**: Group roles definition (relay-generated)

### NIP-C7 Chat Events

- **Kind 9**: Chat messages with `h` tag for group identification
  - Replies use `q` tag to quote parent messages
  - Content includes `nostr:nevent1...` references when replying

### NIP-7D Thread Events

- **Kind 11**: Thread posts with `h` tag for group identification
  - Must include `title` tag for thread title
  - Used for starting discussion topics
- **Kind 1111**: Comments on threads (NIP-22)
  - Must include `K` tag with value "11" (root kind)
  - Must include `E` tag referencing the root thread event
  - Must include `P` tag with root thread author pubkey
  - For replies to comments: include lowercase `e`, `k`, `p` tags for parent comment

### NIP-57 Zap Events

- **Kind 9734**: Zap requests (not published to relays, sent to LNURL endpoints)
- **Kind 9735**: Zap receipts (published by lightning wallets)

## Group Message Structure

### Chat Messages (Kind 9 - NIP-C7)

Chat messages in groups must include:

- `h` tag with the group ID
- `previous` tag with references to recent events (for timeline integrity)
- Optional `q` tag for replies with event ID, relay URL, and pubkey

Example chat message:
```json
{
  "kind": 9,
  "content": "Hello everyone!",
  "tags": [
    ["h", "pizza-lovers"],
    ["previous", "a1b2c3d4", "e5f6g7h8", "i9j0k1l2"]
  ]
}
```

Example chat reply:
```json
{
  "kind": 9,
  "content": "nostr:nevent1...\nyes, I agree!",
  "tags": [
    ["h", "pizza-lovers"],
    ["q", "<parent-event-id>", "<relay-url>", "<parent-author-pubkey>"],
    ["previous", "a1b2c3d4", "e5f6g7h8", "i9j0k1l2"]
  ]
}
```

### Thread Posts (Kind 11 - NIP-7D)

Thread posts in groups must include:

- `h` tag with the group ID
- `title` tag with the thread title
- `previous` tag with references to recent events

Example thread:
```json
{
  "kind": 11,
  "content": "What's everyone's favorite pizza topping?",
  "tags": [
    ["h", "pizza-lovers"],
    ["title", "Favorite Pizza Toppings"],
    ["previous", "a1b2c3d4", "e5f6g7h8", "i9j0k1l2"]
  ]
}
```

### Thread Comments (Kind 1111 - NIP-22)

Comments on threads must include:

- `h` tag with the group ID
- `K` tag with value "11" (root thread kind)
- `E` tag with root thread event ID, relay URL, and author pubkey
- `P` tag with root thread author pubkey
- For replies to comments: lowercase `e`, `k`, `p` tags for parent comment

Example thread comment:
```json
{
  "kind": 1111,
  "content": "I love pepperoni!",
  "tags": [
    ["h", "pizza-lovers"],
    ["K", "11"],
    ["E", "<thread-event-id>", "<relay-url>", "<thread-author-pubkey>"],
    ["P", "<thread-author-pubkey>"],
    ["e", "<thread-event-id>", "<relay-url>", "<thread-author-pubkey>"],
    ["k", "11"],
    ["p", "<thread-author-pubkey>"],
    ["previous", "a1b2c3d4", "e5f6g7h8", "i9j0k1l2"]
  ]
}
```

### Legacy Support

- **Kind 1**: Still supported for backward compatibility with existing messages

## Zap Integration

Messages can be zapped using NIP-57:

1. User clicks zap button on a message
2. Client creates a zap request (kind 9734) with the message event ID in `e` tag
3. Zap request is sent to the message author's LNURL endpoint
4. Lightning invoice is generated and paid
5. Zap receipt (kind 9735) is published to relays

## Group Identification

Groups are identified by the format `<relay-host>'<group-id>`:
- Example: `groups.0xchat.com'general`
- Default group ID `_` for relay-local discussions

## Security Features

- Timeline references prevent message replay attacks
- Late publication prevention
- Admin-only moderation events
- Relay signature verification for metadata events