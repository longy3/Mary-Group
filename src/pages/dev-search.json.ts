import type { APIRoute } from "astro";
import { getSortedPosts } from "@utils/content-utils";
import { getPostUrlBySlug } from "@utils/url-utils";

export const GET: APIRoute = async () => {
	if (!import.meta.env.DEV) return new Response(null, { status: 404 });
	const posts = await getSortedPosts();
	return Response.json(posts.map(({ slug, body, data }) => ({
		url: getPostUrlBySlug(slug),
		title: data.title,
		description: data.description,
		category: data.category,
		tags: data.tags,
		body: body || "",
	})), { headers: { "Cache-Control": "no-store" } });
};
