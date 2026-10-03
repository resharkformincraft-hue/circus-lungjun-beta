import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dir=path.resolve('data');fs.mkdirSync(dir,{recursive:true});
const db=new Database(path.join(dir,'circus.sqlite'));
db.pragma('journal_mode=WAL');
db.pragma('foreign_keys=ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profiles(user_id TEXT PRIMARY KEY,display_name TEXT NOT NULL,avatar TEXT NOT NULL DEFAULT '🎪',league_points INTEGER NOT NULL DEFAULT 0,wins INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,room_code TEXT UNIQUE NOT NULL,host_id TEXT NOT NULL,mode TEXT NOT NULL,status TEXT NOT NULL,settings_json TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS room_players(room_id TEXT NOT NULL,user_id TEXT NOT NULL,seat INTEGER NOT NULL,ready INTEGER NOT NULL DEFAULT 0,connected INTEGER NOT NULL DEFAULT 0,joined_at TEXT NOT NULL,last_seen_at TEXT NOT NULL,PRIMARY KEY(room_id,user_id),FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS games(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,mode TEXT NOT NULL,status TEXT NOT NULL,state_json TEXT NOT NULL,state_version INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,finished_at TEXT);
CREATE TABLE IF NOT EXISTS chat_messages(id INTEGER PRIMARY KEY AUTOINCREMENT,room_id TEXT NOT NULL,user_id TEXT NOT NULL,message TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'CHAT',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS seasons(id TEXT PRIMARY KEY,name TEXT NOT NULL,start_date TEXT NOT NULL,end_date TEXT,total_games INTEGER NOT NULL DEFAULT 100,status TEXT NOT NULL DEFAULT 'ACTIVE',champion_id TEXT);
CREATE TABLE IF NOT EXISTS league_stats(season_id TEXT NOT NULL,user_id TEXT NOT NULL,points INTEGER NOT NULL DEFAULT 0,wins INTEGER NOT NULL DEFAULT 0,games_played INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(season_id,user_id));
CREATE TABLE IF NOT EXISTS game_history(id TEXT PRIMARY KEY,game_id TEXT NOT NULL,room_id TEXT NOT NULL,mode TEXT NOT NULL,result_json TEXT NOT NULL,created_at TEXT NOT NULL);
`);
try{db.exec('ALTER TABLE seasons ADD COLUMN champion_id TEXT');}catch{}
try{
 const indexes=db.prepare('PRAGMA index_list(games)').all();
 const uniqueRoom=indexes.filter(i=>i.unique).some(i=>db.prepare(`PRAGMA index_info('${String(i.name).replaceAll("'","''")}')`).all().some(c=>c.name==='room_id'));
 if(uniqueRoom){
  db.exec(`CREATE TABLE games_migrate(id TEXT PRIMARY KEY,room_id TEXT NOT NULL,mode TEXT NOT NULL,status TEXT NOT NULL,state_json TEXT NOT NULL,state_version INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,finished_at TEXT);`);
  db.exec(`INSERT INTO games_migrate SELECT id,room_id,mode,status,state_json,state_version,created_at,updated_at,finished_at FROM games;`);
  db.exec('DROP TABLE games; ALTER TABLE games_migrate RENAME TO games;');
 }
}catch{}
export default db;
