# Affiliate click-through links

This document explains how to set up affiliate links for products and how they appear to players.

## Admin setup

1. Log in as an admin (e.g. `demo@silentreview.app`).
2. Go to **Admin → Products**.
3. Find the product you want to link and click the **Affiliate** button.
4. Enter a valid `http://` or `https://` URL and tap **Save**.
5. The product now has an affiliate URL. You can see it listed in the product row, along with a `clickCount`.
6. (Optional) View click reports in **Admin → Affiliate Clicks**. You can export the list as a CSV.

## What a player sees

A player sees a **“Shop this product”** button on a video when **all** of the following are true:

- The review is **published** and visible in the feed or on a detail page.
- The product attached to that review has a non-empty `affiliateUrl` set by an admin.
- The app is running a build that includes the affiliate feature (both the API and the web bundle must expose `product.affiliateUrl`).

The button appears next to the product tag in the video info overlay, both in the **Browse/Play feed** and on the **review detail page**.

## How it works

1. The player taps **“Shop this product”**.
2. The app calls `POST /api/revenue/affiliate/:productId/click`, passing the `reviewId` so the click is attributable.
3. The API records an `AffiliateClick` row (IP, user agent, referrer, user, review, timestamp) and increments the product’s `clickCount`.
4. The API returns the resolved affiliate URL.
5. The app opens the URL in a new browser tab.
6. If the tracking call fails for any reason, the app falls back to opening the stored `affiliateUrl` directly so the player is not stuck.

## Demo / testing

To see the feature without manually setting a URL, run the Serge demo seed:

```bash
docker exec -w /app silent-review-api packages/database/node_modules/.bin/tsx packages/database/prisma/seed-serge.ts --force
```

This creates an **“Affiliate Demo Product”** with a demo URL and two recent reviews. The seed output prints direct `/review/:id` links you can open to see the **Shop this product** button immediately.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| No **Shop this product** button | The product has no `affiliateUrl`, or there is no published review for that product, or the API/web build is out of date. |
| Button appears but click not recorded | API container is not running the latest affiliate code; redeploy with `ENV_FILE=.env.prod ./scripts/deploy.sh`. |
| Cannot find the demo review | Clear the feed cache: `docker exec silent-review-redis sh -c 'for key in $(redis-cli --scan --pattern "feed:*"); do redis-cli DEL "$key" >/dev/null; done'` |
