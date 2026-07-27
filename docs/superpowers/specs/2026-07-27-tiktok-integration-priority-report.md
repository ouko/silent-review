# TikTok Integration Priority Report

## Objective
Build TikTok integration progressively so Silent Review can leverage the "silent review" product-rating trend that is already viral on TikTok. The first deliverable is this prioritized report; implementation follows after the plan is agreed.

## Current State (as of 2026-07-27)

### What already exists
- **Share sheet** (`apps/web/src/components/share/ShareSheet.tsx`) with platform export templates for TikTok, Instagram Reel, YouTube Short, Snapchat, and Twitter/X.
- **Canvas video renderer** (`apps/web/src/lib/export/canvasRenderer.ts`) that generates a vertical `.webm` with caption, watermark, and rating badge.
- **Caption generator** (`apps/web/src/lib/export/captionGenerator.ts`) that produces a caption + hashtags, but hashtags are hard-coded and do **not** include the product name.
- **Native Web Share** (`navigator.share`) fallback in `ShareSheet.tsx`, `RevealScreen.tsx`, and `Feed.tsx`.
- **OAuth provider skeletons** on the API for TikTok, Instagram, Apple, and Google, but the frontend redirect/callback flow is not wired and the buttons currently show "not available in this build."
- **QR-code generator** inside the share sheet.

### What is missing
- Native TikTok app integration / deep links.
- Native Instagram Stories integration.
- Dedicated "Copy link" button.
- Messaging-app-specific sharing.
- Embed code for external sites.
- UTM / share attribution tracking.
- Product-specific hashtags (`#[ProductName]`).
- Auto-generated static thumbnail optimized for TikTok cover image.
- Server-side tracking of shares, clicks, and viral conversion.

## Assumption for Phase Planning
**Phase 1 assumes no official TikTok API partnership yet.** Most early-stage apps cannot get TikTok OAuth/share-to-TikTok API access immediately, so the priority is to remove every friction point for *manual* TikTok posting while capturing attribution data. Once share volume justifies and credentials are obtained, Phase 2 adds native/deep-link integrations.

## Priority List

### Phase 1 — Make TikTok sharing frictionless (no API required)

1. **One-tap "Copy TikTok link" + native share**
   - Add a prominent "Copy link" button in the share sheet that copies a short, UTM-tagged URL to the clipboard.
   - Keep `navigator.share` as the iOS/Android native-share path.
   - Why first: removes the biggest drop-off (users don't know how to share), and UTM data starts flowing immediately.

2. **TikTok-optimized vertical export**
   - Ensure the existing canvas renderer outputs 1080×1920, 9:16, with large readable caption and rating reveal.
   - Add a "Save to camera roll / Downloads" flow that works on mobile Safari/Chrome.
   - Why second: the content must look native to TikTok or it won't perform.

3. **Pre-populated caption with product-specific hashtags**
   - Update `captionGenerator.ts` to include `#[ProductName]` (safe slug) alongside `#SilentReview #ProductReview`.
   - Show the caption in the share sheet so users can copy it before posting.
   - Why third: hashtags are the primary discovery mechanism; the product hashtag turns every post into a searchable entry point.

4. **UTM attribution for every share**
   - Generate share URLs like `/review/:id?utm_source=silentreview&utm_medium=share&utm_campaign=tiktok&utm_content=:productSlug`.
   - Store share events in the database (`share_events` table) with `provider`, `utm_content`, `review_id`, `user_id`, and `created_at`.
   - Add a lightweight analytics endpoint used by the "Viral" dashboard tab.
   - Why fourth: you cannot optimize what you cannot measure; this also gives investor/demo data.

5. **TikTok cover / thumbnail frame picker**
   - Let the user pick a frame from the exported video to use as the TikTok cover image.
   - Generate a 1080×1920 static JPEG from the canvas at the selected time.
   - Why fifth: cover image strongly affects click-through on TikTok.

### Phase 2 — Native/deep-link integrations (requires app credentials / approvals)

6. **TikTok deep-link share**
   - Implement `tiktok://` / `snssdk1233://` deep-link URIs to open the TikTok app with the exported video if the app is installed.
   - Fallback to App Store / copy-link if not installed.
   - Requires: TikTok app client key and, ideally, Mobile Content Provider integration.

7. **Native TikTok share via TikTok For Developers SDK**
   - Server-side OAuth already has a `TikTokProvider`; wire the frontend redirect flow.
   - Use TikTok's Share Kit / Publish API to post on behalf of users.
   - Requires: TikTok developer app approval and scoped permissions.

8. **Instagram Stories deep-link share**
   - Implement `instagram-stories://share` background/sticker asset upload.
   - Requires: Instagram app installed; no server API needed for basic sticker sharing.

9. **Embed widget for external sites**
   - Generate an `<iframe>` embed code for each review.
   - Serve an embeddable player page that loads the review video and "Play on Silent Review" CTA.
   - Track embed plays via the same UTM/ analytics pipeline.

10. **Viral dashboard and share attribution**
    - Build on the Phase 1 analytics endpoint to show top shared reviews, top products, conversion from share → signup, and estimated reach.
    - Reward creators (points, badges) for high-performing shares.

## Recommended Approach

**Build Phase 1 first.** It can ship this week, requires no third-party approvals, and immediately improves the viral loop. The TikTok-optimized export + copy-link + UTM tracking is the highest-leverage combination for an app trying to ride an existing TikTok trend.

**Defer Phase 2 until** you have TikTok/Instagram developer credentials or enough share volume to justify the integration effort.

## Success Metrics
- Share button taps per session.
- Copy-link / native-share conversions.
- UTM-tagged inbound visits from `utm_medium=share`.
- New user signups attributed to `utm_source=silentreview` shares.
- Number of exported videos downloaded per day.

## Out of Scope for Now
- TikTok login/signup as the primary auth method (OAuth skeleton exists but is not wired).
- Paid influencer tracking or affiliate codes.
- Real-time viral leaderboard (can be added after analytics are in place).

## Next Step
Agree on this priority order, then create a detailed implementation plan for Phase 1.
