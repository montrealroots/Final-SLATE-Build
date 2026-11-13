// What the Wikipedia text extracts leave behind where they drop a foreign name or a pronunciation: "Sailor Moon  is",
// "Expected , abbreviated", "Sang-wook, , a gangster". Tidied when a summary or a story is kept (November 13, 2026).
// Line breaks between paragraphs are kept.
export const tidy = (t) => t.replace(/\([ \t]*[,;]?[ \t]*\)/g, '').replace(/,([ \t]*,)+/g, ',').replace(/[ \t]+([,;:!?]|\.(?!\.))/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/gm, '').trim();
