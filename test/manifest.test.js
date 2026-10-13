import { test } from 'node:test';
import assert from 'node:assert/strict';
import { manifest } from '../scripts/build.mjs';

test('manifests are MV3 and browser specific', () => {
  const c = manifest('chrome'), f = manifest('firefox');
  assert.equal(c.manifest_version, 3);
  assert.equal(c.background.service_worker, 'src/background.js');
  assert.deepEqual(f.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
  assert.ok(!c.host_permissions.includes('<all_urls>'));
});
