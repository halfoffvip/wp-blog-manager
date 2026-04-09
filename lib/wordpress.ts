import type { BlogPost } from "./types";

export interface WPPublishResult {
  wpPostId: number;
  link: string;
}

function wpAuthHeader(username: string, appPassword: string): string {
  return "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
}

export async function publishToWordPress(
  post: BlogPost,
  wpUrl: string,
  wpUsername: string,
  wpAppPassword: string
): Promise<WPPublishResult> {
  const baseUrl = wpUrl.replace(/\/$/, "");
  const apiUrl = `${baseUrl}/wp-json/wp/v2/posts`;

  // Build post body with CTA appended
  let content = post.content;
  if (post.ctaText && post.ctaUrl) {
    content += `
<div class="wp-blog-manager-cta" style="background:#f3f4f6;border-radius:8px;padding:24px;margin-top:40px;text-align:center;">
  <p style="font-size:18px;font-weight:600;margin-bottom:12px;">${escapeHtml(post.ctaText)}</p>
  <a href="${escapeHtml(post.ctaUrl)}" style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">${escapeHtml(post.ctaLabel ?? "Learn More")}</a>
</div>`;
  }

  const body: Record<string, unknown> = {
    title: post.title,
    content,
    excerpt: post.excerpt,
    slug: post.slug,
    status: "publish",
  };

  if (post.category) {
    // Try to find or create category
    const catId = await findOrCreateCategory(baseUrl, wpUsername, wpAppPassword, post.category);
    if (catId) body.categories = [catId];
  }

  if (post.tags && post.tags.length > 0) {
    const tagIds = await findOrCreateTags(baseUrl, wpUsername, wpAppPassword, post.tags);
    body.tags = tagIds;
  }

  // Set featured image if available
  if (post.featuredImageUrl) {
    const mediaId = await uploadFeaturedImage(
      baseUrl,
      wpUsername,
      wpAppPassword,
      post.featuredImageUrl,
      post.title
    );
    if (mediaId) body.featured_media = mediaId;
  }

  // Yoast SEO fields (if plugin active)
  body.meta = {
    _yoast_wpseo_title: post.seoTitle,
    _yoast_wpseo_metadesc: post.seoDescription,
    _yoast_wpseo_focuskw: post.focusKeyword,
  };

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: wpAuthHeader(wpUsername, wpAppPassword),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WordPress publish failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { wpPostId: data.id, link: data.link };
}

async function findOrCreateCategory(
  baseUrl: string,
  username: string,
  appPassword: string,
  name: string
): Promise<number | null> {
  const auth = wpAuthHeader(username, appPassword);
  const searchRes = await fetch(
    `${baseUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(name)}`,
    { headers: { Authorization: auth } }
  );
  if (!searchRes.ok) return null;
  const cats = await searchRes.json();
  if (cats.length > 0) return cats[0].id;

  const createRes = await fetch(`${baseUrl}/wp-json/wp/v2/categories`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!createRes.ok) return null;
  const cat = await createRes.json();
  return cat.id;
}

async function findOrCreateTags(
  baseUrl: string,
  username: string,
  appPassword: string,
  names: string[]
): Promise<number[]> {
  const auth = wpAuthHeader(username, appPassword);
  const ids: number[] = [];

  for (const name of names) {
    const searchRes = await fetch(
      `${baseUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(name)}`,
      { headers: { Authorization: auth } }
    );
    if (!searchRes.ok) continue;
    const tags = await searchRes.json();
    if (tags.length > 0) {
      ids.push(tags[0].id);
    } else {
      const createRes = await fetch(`${baseUrl}/wp-json/wp/v2/tags`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!createRes.ok) continue;
      const tag = await createRes.json();
      ids.push(tag.id);
    }
  }

  return ids;
}

async function uploadFeaturedImage(
  baseUrl: string,
  username: string,
  appPassword: string,
  imageUrl: string,
  altText: string
): Promise<number | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1] ?? "jpg";
    const fileName = `hero-${Date.now()}.${ext}`;

    const uploadRes = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: wpAuthHeader(username, appPassword),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": contentType,
      },
      body: buffer,
    });

    if (!uploadRes.ok) return null;
    const media = await uploadRes.json();

    // Set alt text
    await fetch(`${baseUrl}/wp-json/wp/v2/media/${media.id}`, {
      method: "POST",
      headers: {
        Authorization: wpAuthHeader(username, appPassword),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ alt_text: altText }),
    });

    return media.id;
  } catch {
    return null;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
