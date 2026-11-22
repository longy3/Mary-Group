<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";

export let hasPosts: boolean;

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let initialized = false;
let loading = false;
let failed = false;
let query = "";
let requestId = 0;
const chinese = i18n(I18nKey.search) === "搜索";

type DevPost = {
	url: string;
	title: string;
	description: string;
	category: string | null;
	tags: string[];
	body: string;
};

let devIndex: Promise<DevPost[]> | undefined;

async function searchDevelopment(keyword: string): Promise<SearchResult[]> {
	devIndex ??= fetch(url("/dev-search.json"))
		.then((response) => {
			if (!response.ok) throw new Error("Development search failed");
			return response.json();
		})
		.catch((error) => {
			devIndex = undefined;
			throw error;
		});
	const key = keyword.toLowerCase();
	const results: SearchResult[] = [];
	for (const post of await devIndex) {
		const match = post.body.toLowerCase().indexOf(key);
		if (
			match < 0 &&
			![post.title, post.description, post.category, ...post.tags].some(
				(value) => value?.toLowerCase().includes(key),
			)
		)
			continue;
		const start = Math.max(0, match - 30);
		const excerpt = post.description || post.body.slice(start, start + 100);
		results.push({
			url: post.url,
			meta: { title: post.title },
			excerpt: excerpt
				.replaceAll("&", "&amp;")
				.replaceAll("<", "&lt;")
				.replaceAll(">", "&gt;"),
		});
		if (results.length >= 20) break;
	}
	return results;
}

const togglePanel = () => {
	document
		.getElementById("search-panel")
		?.classList.toggle("float-panel-closed");
};

async function search(keyword: string, isDesktop: boolean) {
	const id = ++requestId;
	query = keyword.trim();
	result = [];
	failed = false;
	loading = Boolean(query);
	if (isDesktop) {
		document
			.getElementById("search-panel")
			?.classList.toggle("float-panel-closed", !query);
	}
	if (!query) return;

	try {
		let matches: SearchResult[];
		if (import.meta.env.DEV) {
			matches = await searchDevelopment(query);
		} else if (!hasPosts) {
			matches = [];
		} else if (window.pagefind) {
			const response = await window.pagefind.search(query);
			matches = await Promise.all(
				response.results.slice(0, 20).map((item) => item.data()),
			);
		} else {
			throw new Error("Search index unavailable");
		}
		if (id === requestId) result = matches;
	} catch {
		if (id === requestId) failed = true;
	} finally {
		if (id === requestId) loading = false;
	}
}

onMount(() => {
	const ready = () => {
		initialized = true;
		const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
		const keyword = isDesktop ? keywordDesktop : keywordMobile;
		if (keyword) void search(keyword, isDesktop);
	};
	if (import.meta.env.DEV || !hasPosts || window.pagefind) ready();
	document.addEventListener("pagefindready", ready);
	document.addEventListener("pagefindloaderror", ready);
	return () => {
		document.removeEventListener("pagefindready", ready);
		document.removeEventListener("pagefindloaderror", ready);
	};
});

function updateSearch(event: Event, isDesktop: boolean) {
	const keyword = (event.currentTarget as HTMLInputElement).value;
	if (initialized) void search(keyword, isDesktop);
}
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
">
    <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
    <input placeholder="{i18n(I18nKey.search)}" bind:value={keywordDesktop} on:input={(e) => updateSearch(e, true)} on:focus={() => initialized && search(keywordDesktop, true)} aria-label={i18n(I18nKey.search)}
           class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
    >
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label={i18n(I18nKey.search)} id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  ">
        <Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"></Icon>
        <input placeholder={i18n(I18nKey.search)} aria-label={i18n(I18nKey.search)} bind:value={keywordMobile} on:input={(e) => updateSearch(e, false)}
               class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
        >
    </div>

    {#if query && (loading || failed || result.length === 0)}
        <p role="status" class="px-3 py-2 text-sm text-75">
            {loading ? (chinese ? "正在搜索…" : "Searching…") : failed ? (chinese ? "搜索暂不可用。" : "Search is unavailable.") : (chinese ? "没有找到相关的文章。" : "No matching articles.")}
        </p>
    {/if}

    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
            <div class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
            </div>
            <div class="transition text-sm text-50">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
