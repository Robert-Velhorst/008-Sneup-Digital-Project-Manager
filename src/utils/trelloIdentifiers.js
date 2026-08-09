const TRELLO_CARD_HOSTS = new Set(['trello.com', 'www.trello.com']);
const TRELLO_SHORT_LINK_PATTERN = /^[a-zA-Z0-9]{8}$/;

const extractTrelloCardShortLink = (value) => {
  const candidate = String(value || '').trim();
  if (TRELLO_SHORT_LINK_PATTERN.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    if (!TRELLO_CARD_HOSTS.has(url.hostname.toLowerCase())) return null;
    const match = url.pathname.match(/^\/c\/([a-zA-Z0-9]{8})(?:\/|$)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const trelloCardAliases = (card = {}) => Array.from(new Set([
  card.shortLink,
  card.shortUrl,
  card.url
].map(extractTrelloCardShortLink).filter(Boolean)));

module.exports = {
  extractTrelloCardShortLink,
  trelloCardAliases
};
