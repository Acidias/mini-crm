export type LinkedInCheckResult = { valid: boolean; status: number; redirected?: string };

export async function checkLinkedIn(url: string): Promise<LinkedInCheckResult> {
  try {
    let normalised = url.trim();
    if (!normalised.startsWith("http")) normalised = `https://${normalised}`;
    if (!normalised.includes("linkedin.com")) {
      return { valid: false, status: 0 };
    }

    const pathMatch = normalised.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (!pathMatch) {
      return { valid: false, status: 0 };
    }

    const res = await fetch(normalised, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 404 || res.status === 410) {
      return { valid: false, status: res.status };
    }

    const body = await res.text();

    const isSoft404 =
      body.includes("Page not found") ||
      body.includes("page-not-found") ||
      body.includes("profile-unavailable") ||
      body.includes("This page doesn\u2019t exist") ||
      body.includes("This page doesn't exist") ||
      body.includes('"statusCode":404');
    if (isSoft404) return { valid: false, status: res.status };

    const hasProfileMeta =
      body.includes('og:type" content="profile"') ||
      body.includes("pv-top-card") ||
      body.includes("profile-section") ||
      body.includes('"@type":"Person"');
    if (hasProfileMeta) return { valid: true, status: res.status };

    const slug = pathMatch[1].toLowerCase();
    const bodyLower = body.toLowerCase();
    const hasSlugReference = bodyLower.includes(slug.replace(/-/g, " ")) ||
      bodyLower.includes(`/in/${slug}`);
    if (hasSlugReference) return { valid: true, status: res.status };

    return { valid: false, status: res.status, redirected: "login" };
  } catch {
    return { valid: false, status: 0 };
  }
}
