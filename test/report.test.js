import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportUrl, summarizeDetection } from '../src/core/report.js';

test('report link carries only the host, version and detection summary', () => {
  const url = new URL(reportUrl({
    pageUrl: 'https://www.fnac.com/a12345/Some-Product?session=abc&email=me@example.com#reviews',
    version: '0.4.0', browser: 'Firefox', detection: summarizeDetection({ adapter: 'generic', price: 10, oldPrice: null, shopLow30: null }),
  }));
  assert.equal(url.origin + url.pathname, 'https://github.com/emirmrkaljevic/truediscount/issues/new');
  assert.equal(url.searchParams.get('shop'), 'fnac.com');
  assert.equal(url.searchParams.get('template'), 'broken-shop.yml');
  assert.equal(url.searchParams.get('version'), '0.4.0 (Firefox)');
  assert.match(url.searchParams.get('detected'), /crossed-out price: not found/);
  assert.doesNotMatch(url.href, /a12345|session|example\.com|reviews/);
});

test('detection summaries', () => {
  assert.equal(summarizeDetection(undefined), 'extension not active on this site');
  assert.equal(summarizeDetection(null), 'no product price found');
});

test('non-web pages give an empty host', () => {
  assert.equal(new URL(reportUrl({ pageUrl: 'about:blank', version: '1', browser: 'Chrome', detection: '' })).searchParams.get('shop'), '');
});
