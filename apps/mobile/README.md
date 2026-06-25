# @elixio/mobile

Elixio Digital mobile app built with Expo SDK 56 and Expo Router.

## Setup

From the repository root:

```bash
pnpm install
```

## Development

```bash
pnpm dev:mobile
# or from this directory
pnpm dev
```

## Scripts

- `pnpm dev` — start the Expo development server
- `pnpm android` — start the Android dev client
- `pnpm ios` — start the iOS dev client
- `pnpm lint` / `pnpm typecheck` — run TypeScript without emitting
- `pnpm build` — export static bundles with `expo export`
- `pnpm clean` — remove generated files and installed dependencies

## Environment variables

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL` to the API base URL.

## EAS Build

Configure EAS with your project ID, then run:

```bash
eas build --platform ios
eas build --platform android
```
