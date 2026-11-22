// biome-ignore lint/suspicious/noShadowRestrictedNames: <toString from mdast-util-to-string>
import { toString } from "mdast-util-to-string";
import getReadingTime from "reading-time";

export function remarkReadingTime() {
	return (tree, { data }) => {
		const textOnPage = toString(tree);
		const han = /\p{Script=Han}/gu;
		const hanCount = (textOnPage.match(han) || []).length;
		const readingTime = getReadingTime(textOnPage.replace(han, " "));
		data.astro.frontmatter.minutes = Math.max(
			1,
			Math.round(readingTime.minutes + hanCount / 350),
		);
		data.astro.frontmatter.words = readingTime.words + hanCount;
	};
}
