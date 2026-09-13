import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vault=fs.readFileSync(new URL('../src-tauri/src/vault.rs',import.meta.url),'utf8');

test('Anhangsinhalte und Metadaten werden gemeinsam verschlüsselt',()=>{
  assert.match(vault,/serde_json::to_vec\(&payload\)/);
  assert.match(vault,/VALUES\(\?1,'','','','',\?2,\?3\)/);
  assert.doesNotMatch(vault,/WHERE student_id=\?1/);
});

test('Datentresor verwendet AES-256-GCM, Argon2 und zufällige Nonces',()=>{
  assert.match(vault,/Aes256Gcm/);
  assert.match(vault,/Argon2::default\(\)\.hash_password_into/);
  assert.match(vault,/OsRng\.fill_bytes\(&mut nonce\)/);
});

test('Kennwort- und Anhangsgrenzen sind im Backend erzwungen',()=>{
  assert.match(vault,/password\.chars\(\)\.count\(\) < 12/);
  assert.match(vault,/const MAX_ATTACHMENT: usize = 5 \* 1024 \* 1024/);
});
