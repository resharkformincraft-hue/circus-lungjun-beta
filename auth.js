import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db from './db.js';
const SECRET=process.env.JWT_SECRET||'dev-only-change-this-secret';
export const hashPassword=p=>bcrypt.hashSync(p,12);
export const verifyPassword=(p,h)=>bcrypt.compareSync(p,h);
export const signToken=user=>jwt.sign({sub:user.id,username:user.username},SECRET,{expiresIn:'30d'});
export const verifyToken=t=>jwt.verify(t,SECRET);
export const newId=()=>crypto.randomUUID();
export function createUser(username,password){const id=newId(),now=new Date().toISOString();db.prepare('INSERT INTO users(id,username,password_hash,created_at) VALUES(?,?,?,?)').run(id,username,hashPassword(password));db.prepare('INSERT INTO profiles(user_id,display_name,avatar) VALUES(?,?,?)').run(id,username,'🎪');return{id,username};}
export const findUser=username=>db.prepare('SELECT * FROM users WHERE username=?').get(username);
export const getUser=id=>db.prepare('SELECT u.id,u.username,p.display_name,p.avatar,p.league_points,p.wins FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=?').get(id);
