const { extractTrelloCardShortLink, trelloCardAliases } = require('../src/utils/trelloIdentifiers');

describe('Trello identifiers', () => {
  test('accepts canonical short links and official Trello card URLs', () => {
    expect(extractTrelloCardShortLink('Ab12Cd34')).toBe('Ab12Cd34');
    expect(extractTrelloCardShortLink('https://trello.com/c/Zy98Xw76/card-title')).toBe('Zy98Xw76');
    expect(extractTrelloCardShortLink('https://www.trello.com/c/Qr12St34')).toBe('Qr12St34');
  });

  test('rejects lookalike hosts, non-card paths, and malformed identifiers', () => {
    expect(extractTrelloCardShortLink('https://trello.example/c/Zy98Xw76')).toBeNull();
    expect(extractTrelloCardShortLink('https://trello.com/b/Zy98Xw76/board')).toBeNull();
    expect(extractTrelloCardShortLink('card-2')).toBeNull();
  });

  test('deduplicates aliases across short and long URL forms', () => {
    expect(trelloCardAliases({
      shortLink: 'Ab12Cd34',
      shortUrl: 'https://trello.com/c/Ab12Cd34',
      url: 'https://trello.com/c/Ab12Cd34/card-title'
    })).toEqual(['Ab12Cd34']);
  });
});
