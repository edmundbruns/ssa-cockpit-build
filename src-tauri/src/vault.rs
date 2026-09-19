use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Nonce};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::{rngs::OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{path::PathBuf, time::{SystemTime, UNIX_EPOCH}};
use thiserror::Error;
use zeroize::{Zeroize, ZeroizeOnDrop};

const CHECK_TEXT: &[u8] = b"SSA-Cockpit-Datentresor-v1";
const MAX_ATTACHMENT: usize = 5 * 1024 * 1024;

#[derive(Debug, Error)]
pub enum VaultError {
    #[error("Datenbankfehler")]
    Db(#[from] rusqlite::Error),
    #[error("Kennwort oder Sicherungsdatei ist nicht korrekt")]
    Crypto,
    #[error("Das Kennwort muss mindestens 12 Zeichen lang sein")]
    Password,
    #[error("Der Datentresor ist nicht entsperrt")]
    Locked,
    #[error("Ungültige Daten")]
    Invalid,
    #[error("Dateityp oder Dateigröße ist nicht zulässig")]
    Attachment,
    #[error("Dateifehler")]
    Io(#[from] std::io::Error),
    #[error("JSON-Fehler")]
    Json(#[from] serde_json::Error),
}

#[derive(Zeroize, ZeroizeOnDrop)]
struct SessionKey([u8; 32]);

#[derive(Serialize, Deserialize)]
struct BackupPlain {
    state_json: String,
    attachments: Vec<BackupAttachment>,
}

#[derive(Serialize, Deserialize)]
struct BackupAttachment {
    id: String,
    student_id: String,
    name: String,
    mime_type: String,
    added: String,
    bytes_b64: String,
}

#[derive(Serialize, Deserialize)]
struct BackupEnvelope {
    backup_type: String,
    version: u32,
    created_at: u64,
    salt: String,
    nonce: String,
    ciphertext: String,
    digest: String,
}

pub struct Vault {
    conn: Connection,
    key: Option<SessionKey>,
    path: PathBuf,
}

impl Vault {
    pub fn open_at(path: PathBuf) -> Result<Self, VaultError> {
        let conn = Connection::open(&path)?;
        conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),nonce BLOB NOT NULL,ciphertext BLOB NOT NULL);
          CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY,student_id TEXT NOT NULL,name TEXT NOT NULL,mime_type TEXT NOT NULL,added TEXT NOT NULL,nonce BLOB NOT NULL,ciphertext BLOB NOT NULL);")?;
        Ok(Self { conn, key: None, path })
    }

    pub fn status(&mut self) -> Result<Value, VaultError> {
        let configured: bool = self.conn.query_row("SELECT EXISTS(SELECT 1 FROM meta WHERE key='salt')", [], |r| r.get(0))?;
        Ok(json!({"configured":configured,"unlocked":self.key.is_some()}))
    }

    fn validate_password(password: &str) -> Result<(), VaultError> {
        if password.chars().count() < 12 { Err(VaultError::Password) } else { Ok(()) }
    }

    fn derive(password: &str, salt: &[u8]) -> Result<[u8; 32], VaultError> {
        let mut out = [0u8; 32];
        Argon2::default().hash_password_into(password.as_bytes(), salt, &mut out).map_err(|_| VaultError::Crypto)?;
        Ok(out)
    }

    fn encrypt(key: &[u8; 32], plain: &[u8]) -> Result<(Vec<u8>, Vec<u8>), VaultError> {
        let mut nonce = [0u8; 12]; OsRng.fill_bytes(&mut nonce);
        let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| VaultError::Crypto)?;
        let ciphertext = cipher.encrypt(Nonce::from_slice(&nonce), plain).map_err(|_| VaultError::Crypto)?;
        Ok((nonce.to_vec(), ciphertext))
    }

    fn decrypt(key: &[u8; 32], nonce: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, VaultError> {
        if nonce.len()!=12 { return Err(VaultError::Crypto); }
        let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| VaultError::Crypto)?;
        cipher.decrypt(Nonce::from_slice(nonce), ciphertext).map_err(|_| VaultError::Crypto)
    }

    fn session(&self) -> Result<&[u8;32], VaultError> { self.key.as_ref().map(|x| &x.0).ok_or(VaultError::Locked) }

    pub fn setup_json(&mut self, password:String, initial_state_json:String) -> Result<Value,VaultError> {
        Self::validate_password(&password)?;
        if self.conn.query_row("SELECT EXISTS(SELECT 1 FROM meta WHERE key='salt')",[],|r|r.get::<_,bool>(0))? { return Err(VaultError::Invalid); }
        let mut salt=[0u8;16]; OsRng.fill_bytes(&mut salt);
        let key=Self::derive(&password,&salt)?;
        let (check_nonce,check)=Self::encrypt(&key,CHECK_TEXT)?;
        let tx=self.conn.transaction()?;
        tx.execute("INSERT INTO meta(key,value) VALUES('salt',?1)",[B64.encode(salt)])?;
        tx.execute("INSERT INTO meta(key,value) VALUES('check_nonce',?1)",[B64.encode(check_nonce)])?;
        tx.execute("INSERT INTO meta(key,value) VALUES('check',?1)",[B64.encode(check)])?;
        tx.commit()?;
        self.key=Some(SessionKey(key));
        self.save_state_json(initial_state_json)?;
        Ok(json!({"ok":true}))
    }

    pub fn unlock_json(&mut self,password:String)->Result<Value,VaultError>{
        let salt=B64.decode(self.meta("salt")?).map_err(|_|VaultError::Crypto)?;
        let nonce=B64.decode(self.meta("check_nonce")?).map_err(|_|VaultError::Crypto)?;
        let check=B64.decode(self.meta("check")?).map_err(|_|VaultError::Crypto)?;
        let key=Self::derive(&password,&salt)?;
        if Self::decrypt(&key,&nonce,&check)? != CHECK_TEXT { return Err(VaultError::Crypto); }
        self.key=Some(SessionKey(key));
        let state=self.read_state()?;
        Ok(json!({"stateJson":state}))
    }

    fn meta(&self,name:&str)->Result<String,VaultError>{self.conn.query_row("SELECT value FROM meta WHERE key=?1",[name],|r|r.get(0)).map_err(Into::into)}

    fn read_state(&self)->Result<String,VaultError>{
        let row:Option<(Vec<u8>,Vec<u8>)>=self.conn.query_row("SELECT nonce,ciphertext FROM state WHERE id=1",[],|r|Ok((r.get(0)?,r.get(1)?))).optional()?;
        match row { Some((n,c))=>String::from_utf8(Self::decrypt(self.session()?,&n,&c)?).map_err(|_|VaultError::Invalid), None=>Ok("{}".into()) }
    }

    pub fn save_state_json(&mut self,state_json:String)->Result<Value,VaultError>{
        let _:Value=serde_json::from_str(&state_json)?;
        let (n,c)=Self::encrypt(self.session()?,state_json.as_bytes())?;
        self.conn.execute("INSERT INTO state(id,nonce,ciphertext) VALUES(1,?1,?2) ON CONFLICT(id) DO UPDATE SET nonce=excluded.nonce,ciphertext=excluded.ciphertext",params![n,c])?;
        Ok(json!({"ok":true}))
    }

    pub fn lock_json(&mut self)->Result<Value,VaultError>{self.key=None;Ok(json!({"ok":true}))}

    pub fn put_attachment_json(&mut self,student_id:String,name:String,mime_type:String,bytes:Vec<u8>)->Result<Value,VaultError>{
        if !["application/pdf","image/jpeg","image/png","application/vnd.openxmlformats-officedocument.wordprocessingml.document"].contains(&mime_type.as_str()) || bytes.len()>MAX_ATTACHMENT || student_id.len()>80 || name.len()>220 {return Err(VaultError::Attachment)}
        let id=format!("att-{}-{:08x}",now(),rand::random::<u32>());
        let added=now().to_string();
        let payload=BackupAttachment{id:id.clone(),student_id,name:name.clone(),mime_type:mime_type.clone(),added:added.clone(),bytes_b64:B64.encode(&bytes)};
        let (n,c)=Self::encrypt(self.session()?,&serde_json::to_vec(&payload)?)?;
        self.conn.execute("INSERT INTO attachments(id,student_id,name,mime_type,added,nonce,ciphertext) VALUES(?1,'','','','',?2,?3)",params![id,n,c])?;
        Ok(json!({"id":id,"name":name,"mimeType":mime_type,"size":bytes.len(),"added":added}))
    }

    pub fn list_attachments_json(&mut self,student_id:String)->Result<Value,VaultError>{
        let key=*self.session()?;
        let mut st=self.conn.prepare("SELECT nonce,ciphertext FROM attachments")?;
        let encrypted=st.query_map([],|r|Ok((r.get::<_,Vec<u8>>(0)?,r.get::<_,Vec<u8>>(1)?)))?.collect::<Result<Vec<_>,_>>()?;
        let mut rows=Vec::new();
        for (n,c) in encrypted {
            let item:BackupAttachment=serde_json::from_slice(&Self::decrypt(&key,&n,&c)?)?;
            if item.student_id==student_id {
                let size=B64.decode(&item.bytes_b64).map_err(|_|VaultError::Invalid)?.len();
                rows.push(json!({"id":item.id,"name":item.name,"mimeType":item.mime_type,"added":item.added,"size":size}));
            }
        }
        rows.sort_by(|a,b|b["added"].as_str().cmp(&a["added"].as_str()));
        Ok(json!(rows))
    }

    pub fn get_attachment_json(&mut self,id:String)->Result<Value,VaultError>{
        let (n,c):(Vec<u8>,Vec<u8>)=self.conn.query_row("SELECT nonce,ciphertext FROM attachments WHERE id=?1",[id],|r|Ok((r.get(0)?,r.get(1)?)))?;
        let item:BackupAttachment=serde_json::from_slice(&Self::decrypt(self.session()?,&n,&c)?)?;
        let bytes=B64.decode(item.bytes_b64).map_err(|_|VaultError::Invalid)?;
        Ok(json!({"name":item.name,"mimeType":item.mime_type,"bytes":bytes}))
    }

    pub fn delete_attachment_json(&mut self,id:String)->Result<Value,VaultError>{self.session()?;self.conn.execute("DELETE FROM attachments WHERE id=?1",[id])?;Ok(json!({"ok":true}))}

    pub fn export_backup_json(&mut self)->Result<Value,VaultError>{
        let key=*self.session()?;
        let mut st=self.conn.prepare("SELECT nonce,ciphertext FROM attachments")?;
        let mut rows=st.query([])?; let mut attachments=Vec::new();
        while let Some(r)=rows.next()? { let n:Vec<u8>=r.get(0)?;let c:Vec<u8>=r.get(1)?;attachments.push(serde_json::from_slice(&Self::decrypt(&key,&n,&c)?)?); }
        let plain=serde_json::to_vec(&BackupPlain{state_json:self.read_state()?,attachments})?;
        let (nonce,ciphertext)=Self::encrypt(&key,&plain)?;
        let salt=self.meta("salt")?;
        let digest=format!("{:x}",Sha256::digest(&ciphertext));
        let env=BackupEnvelope{backup_type:"SSA-Cockpit-Vault".into(),version:1,created_at:now(),salt,nonce:B64.encode(nonce),ciphertext:B64.encode(ciphertext),digest};
        Ok(json!({"payloadJson":serde_json::to_string_pretty(&env)?}))
    }

    fn backup_dir(&self) -> PathBuf {
        match self.path.parent() {
            Some(p) => p.join("Sicherungen"),
            None => PathBuf::from("Sicherungen"),
        }
    }

    fn backup_list(&self) -> Vec<Value> {
        let mut list: Vec<Value> = Vec::new();
        if let Ok(entries) = std::fs::read_dir(self.backup_dir()) {
            for entry in entries.flatten() {
                let p = entry.path();
                let name = match p.file_name().and_then(|x| x.to_str()) { Some(n) => n.to_string(), None => continue };
                if !name.starts_with("SSA-Cockpit-") || !name.ends_with(".ssa-vault.json") { continue }
                let meta = match entry.metadata() { Ok(m) => m, Err(_) => continue };
                let modified = meta.modified().ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_secs()).unwrap_or(0);
                list.push(json!({"name": name, "size": meta.len(), "modified": modified}));
            }
        }
        list.sort_by(|a, b| b["modified"].as_u64().unwrap_or(0).cmp(&a["modified"].as_u64().unwrap_or(0)));
        list
    }

    pub fn location_json(&mut self) -> Result<Value, VaultError> {
        let list = self.backup_list();
        Ok(json!({
            "database": self.path.to_string_lossy(),
            "backupDir": self.backup_dir().to_string_lossy(),
            "backups": list
        }))
    }

    pub fn write_backup_json(&mut self, file_name: String) -> Result<Value, VaultError> {
        let safe: String = file_name.chars()
            .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
            .take(80).collect();
        if !safe.starts_with("SSA-Cockpit-") || !safe.ends_with(".ssa-vault.json") {
            return Err(VaultError::Invalid);
        }
        let payload = self.export_backup_json()?;
        let text = payload["payloadJson"].as_str().ok_or(VaultError::Invalid)?.to_string();
        let dir = self.backup_dir();
        std::fs::create_dir_all(&dir)?;
        let target = dir.join(&safe);
        std::fs::write(&target, text.as_bytes())?;
        let mut list = self.backup_list();
        while list.len() > 12 {
            if let Some(old) = list.pop() {
                if let Some(name) = old["name"].as_str() {
                    let _ = std::fs::remove_file(dir.join(name));
                }
            }
        }
        Ok(json!({
            "path": target.to_string_lossy(),
            "backupDir": dir.to_string_lossy(),
            "size": text.len(),
            "count": list.len()
        }))
    }

    pub fn import_backup_json(&mut self,payload_json:String,password:String)->Result<Value,VaultError>{
        let env:BackupEnvelope=serde_json::from_str(&payload_json)?;
        if env.backup_type!="SSA-Cockpit-Vault"||env.version!=1{return Err(VaultError::Invalid)}
        let ciphertext=B64.decode(env.ciphertext).map_err(|_|VaultError::Crypto)?;
        if format!("{:x}",Sha256::digest(&ciphertext))!=env.digest{return Err(VaultError::Crypto)}
        let salt=B64.decode(env.salt).map_err(|_|VaultError::Crypto)?;
        let key=Self::derive(&password,&salt)?;
        let nonce=B64.decode(env.nonce).map_err(|_|VaultError::Crypto)?;
        let plain:BackupPlain=serde_json::from_slice(&Self::decrypt(&key,&nonce,&ciphertext)?)?;
        let current=*self.session()?;
        let _:Value=serde_json::from_str(&plain.state_json)?;
        let (sn,sc)=Self::encrypt(&current,plain.state_json.as_bytes())?;
        let tx=self.conn.transaction()?;
        tx.execute("DELETE FROM attachments",[])?;
        tx.execute("INSERT INTO state(id,nonce,ciphertext) VALUES(1,?1,?2) ON CONFLICT(id) DO UPDATE SET nonce=excluded.nonce,ciphertext=excluded.ciphertext",params![sn,sc])?;
        for a in plain.attachments { let bytes=B64.decode(&a.bytes_b64).map_err(|_|VaultError::Invalid)?; if bytes.len()>MAX_ATTACHMENT||!["application/pdf","image/jpeg","image/png","application/vnd.openxmlformats-officedocument.wordprocessingml.document"].contains(&a.mime_type.as_str())||a.student_id.len()>80||a.name.len()>220{return Err(VaultError::Attachment)} let id=a.id.clone();let (n,c)=Self::encrypt(&current,&serde_json::to_vec(&a)?)?;tx.execute("INSERT INTO attachments(id,student_id,name,mime_type,added,nonce,ciphertext) VALUES(?1,'','','','',?2,?3)",params![id,n,c])?; }
        tx.commit()?;
        Ok(json!({"stateJson":plain.state_json}))
    }

    pub fn change_password_json(&mut self,old_password:String,new_password:String)->Result<Value,VaultError>{
        Self::validate_password(&new_password)?;
        let old_salt=B64.decode(self.meta("salt")?).map_err(|_|VaultError::Crypto)?;
        let old_key=Self::derive(&old_password,&old_salt)?;
        if self.key.as_ref().map(|k|k.0)!=Some(old_key){return Err(VaultError::Crypto)}
        let state=self.read_state()?;
        let mut st=self.conn.prepare("SELECT id,nonce,ciphertext FROM attachments")?;
        let encrypted=st.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,Vec<u8>>(1)?,r.get::<_,Vec<u8>>(2)?)))?.collect::<Result<Vec<_>,_>>()?;
        drop(st);
        let mut new_salt=[0u8;16];OsRng.fill_bytes(&mut new_salt);let new_key=Self::derive(&new_password,&new_salt)?;
        let (cn,cc)=Self::encrypt(&new_key,CHECK_TEXT)?;let (sn,sc)=Self::encrypt(&new_key,state.as_bytes())?;
        let tx=self.conn.transaction()?;tx.execute("DELETE FROM attachments",[])?;
        tx.execute("UPDATE meta SET value=?1 WHERE key='salt'",[B64.encode(new_salt)])?;tx.execute("UPDATE meta SET value=?1 WHERE key='check_nonce'",[B64.encode(cn)])?;tx.execute("UPDATE meta SET value=?1 WHERE key='check'",[B64.encode(cc)])?;tx.execute("UPDATE state SET nonce=?1,ciphertext=?2 WHERE id=1",params![sn,sc])?;
        for (id,n,c) in encrypted {let plain=Self::decrypt(&old_key,&n,&c)?;let (nn,nc)=Self::encrypt(&new_key,&plain)?;tx.execute("INSERT INTO attachments(id,student_id,name,mime_type,added,nonce,ciphertext) VALUES(?1,'','','','',?2,?3)",params![id,nn,nc])?;}
        tx.commit()?;self.key=Some(SessionKey(new_key));Ok(json!({"ok":true}))
    }
}

fn now()->u64{SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn encryption_roundtrip(){let key=[7u8;32];let(n,c)=Vault::encrypt(&key,b"geheim").unwrap();assert_eq!(Vault::decrypt(&key,&n,&c).unwrap(),b"geheim");}
    #[test] fn password_policy(){assert!(Vault::validate_password("zu-kurz").is_err());assert!(Vault::validate_password("Mindestens-12").is_ok());}
    #[test] fn vault_roundtrip(){let d=tempfile::tempdir().unwrap();let mut v=Vault::open_at(d.path().join("t.db")).unwrap();v.setup_json("SehrSicher!2026".into(),"{\"cases\":[]}".into()).unwrap();v.save_state_json("{\"cases\":[1]}".into()).unwrap();let b=v.export_backup_json().unwrap()["payloadJson"].as_str().unwrap().to_string();v.lock_json().unwrap();assert_eq!(v.unlock_json("SehrSicher!2026".into()).unwrap()["stateJson"],"{\"cases\":[1]}");let r=v.import_backup_json(b,"SehrSicher!2026".into()).unwrap();assert_eq!(r["stateJson"],"{\"cases\":[1]}");}
}

