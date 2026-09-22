# Local Area SEO Changes

## What Was Added

- Added a dedicated **Local Area SEO** admin page at `/admin/local-area-seo`.
- Added **Local Area SEO** to the admin navigation below **City SEO**.
- Added local-area SEO storage in the `local_area_seo` MongoDB collection and file-backed store.
- Added the protected admin API:
  - `GET /api/admin/local-area-seo`
  - `POST /api/admin/local-area-seo`
- Added local-area SEO links and an **Edit SEO** button to the Local Area SEO section on the City SEO page.
- Added local-area SEO status indicators to the Admin City page.

## Parent and Child Behavior

Each local area belongs to one city using:

- `citySlug`
- `areaSlug`

A local area can use one of two SEO modes:

| Mode | Behavior |
| --- | --- |
| `inherit` | Uses the parent city's title, description, keywords, content, and FAQs. |
| `individual` | Uses the local area's own SEO values. |

A green dot means that the local area has saved `individual` SEO content. Areas using the parent city SEO do not receive the green dot.

## Admin Workflow

1. Open **Admin > Local Area SEO**.
2. Select a city and one of its local areas.
3. Choose **Use parent city SEO** or **Individual local-area SEO**.
4. For individual SEO, edit the title, description, keyword, canonical URL, content, and status.
5. Save the local-area SEO record.
6. The city list and local-area lists show the green individual-SEO indicator.

The City SEO page also includes a local-area list with the city name, green status indicator, and **Edit SEO** button.

## Public Behavior

Local-area URLs remain:

```text
/places/{city}/{local-area}
```

When a local-area SEO record is published in `individual` mode, the local-area page uses its custom metadata, content, and FAQs. Otherwise, the page inherits the published SEO content from its parent city.

The existing city URL remains unchanged:

```text
/places/{city}
```

## Files Changed For Local Area SEO

- `src/lib/models/local-area-seo.ts`
- `src/lib/persist.ts`
- `src/app/api/admin/local-area-seo/route.ts`
- `src/app/admin/local-area-seo/page.tsx`
- `src/app/admin/city-seo/page.tsx`
- `src/app/admin/city/page.tsx`
- `src/components/admin/admin-sidebar.tsx`
- `src/lib/admin-access.ts`
- `src/app/(site)/places/[location]/[id]/page.tsx`

## Validation

- ESLint passed for the local-area SEO implementation.
- Production build passed.
- All routes compiled successfully, including the new admin page and API route.
