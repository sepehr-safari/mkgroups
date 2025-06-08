# Nostr Group Chat

A decentralized group chat application built on the Nostr protocol, featuring NIP-29 group functionality and NIP-57 lightning zaps.

## Features

### 🌐 Decentralized Group Chat (NIP-29)
- **Public Groups**: Join open communities on Nostr relays
- **Real-time Messaging**: Send and receive messages in group chats
- **Group Discovery**: Browse available groups on connected relays
- **Timeline Integrity**: Messages include timeline references to prevent replay attacks
- **Member Management**: View group members and metadata

### ⚡ Lightning Zaps (NIP-57)
- **Zap Messages**: Send lightning payments to message authors
- **WebLN Integration**: Automatic payment with compatible wallets
- **Custom Amounts**: Choose from preset amounts or enter custom values
- **Zap Comments**: Add optional messages to your zaps
- **Zap Receipts**: View zap totals and counts on messages

### 🎨 Modern UI/UX
- **Telegram/WhatsApp Inspired**: Familiar chat interface
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Theme**: Automatic theme switching
- **Real-time Updates**: Messages update automatically
- **Infinite Scroll**: Load older messages with pagination

### 🔐 Nostr Integration
- **Multiple Login Methods**: NIP-07 extensions, private key, etc.
- **Profile Integration**: Display user names and avatars
- **Relay Management**: Switch between different Nostr relays
- **Account Switching**: Manage multiple Nostr accounts

## Default Configuration

- **Default Relay**: `wss://groups.0xchat.com`
- **Group Format**: Groups are identified as `relay'groupId`
- **Default Group**: `_` (general discussion)

## Technology Stack

- **React 18** with TypeScript
- **TailwindCSS** for styling
- **shadcn/ui** components
- **Nostrify** for Nostr protocol integration
- **TanStack Query** for data management
- **React Router** for navigation
- **WebLN** for lightning payments

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

## Usage

1. **Browse Groups**: Visit the home page to see available groups
2. **Join a Group**: Click on any group to enter the chat
3. **Login**: Use the login button to connect your Nostr account
4. **Send Messages**: Type and send messages in the chat
5. **Zap Messages**: Click the zap button on any message to send sats
6. **Switch Relays**: Use the relay selector to connect to different servers

## Group Types

- **Public Groups**: Anyone can read messages
- **Private Groups**: Only authenticated users can read
- **Open Groups**: Anyone can join automatically  
- **Closed Groups**: Require approval or invite codes

## NIP-29 Implementation

This app implements the full NIP-29 specification:

- **Group Messages**: Kind 1 events with `h` tag for group ID
- **Timeline References**: `previous` tag with recent event references
- **Join/Leave Requests**: Kind 9021/9022 events
- **Group Metadata**: Kind 39000 events for group info
- **Member Lists**: Kind 39002 events for group members
- **Moderation Events**: Kind 9000-9020 for group management

## NIP-57 Zap Flow

1. User clicks zap button on a message
2. App creates a zap request (kind 9734) event
3. Request is sent to recipient's LNURL endpoint
4. Lightning invoice is generated and displayed
5. User pays with WebLN or external wallet
6. Zap receipt (kind 9735) is published to relays

## Security Features

- **Timeline Integrity**: Prevents message replay attacks
- **Relay Verification**: Group metadata signed by relay keys
- **Late Publication Prevention**: Rejects old messages
- **Content Security Policy**: Strict CSP headers
- **Input Validation**: All user inputs are validated

## Contributing

This is a demonstration application showcasing NIP-29 and NIP-57 integration. Feel free to fork and extend with additional features!

## License

MIT License - see LICENSE file for details.