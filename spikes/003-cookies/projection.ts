// This is the complete allowlist for cookie facts. Never return the input object.
const sessionNames = new Set(['session','sessionid','jsessionid','phpsessid','asp.net_sessionid','sid','sess','connect.sid']);
export type CookieFacts = { candidate: boolean; httpOnly: boolean; secure: boolean };
export function projectCookie(cookie: Pick<chrome.cookies.Cookie, 'name' | 'httpOnly' | 'secure'>): CookieFacts {
  return { candidate: sessionNames.has(cookie.name.toLowerCase()), httpOnly: cookie.httpOnly, secure: cookie.secure };
}
export type Observation = { status: 'OBSERVED' | 'UNAVAILABLE'; coverage: 'PARTIAL' | 'UNAVAILABLE'; facts: CookieFacts[]; reason: string };
export function unavailable(): Observation { return {status:'UNAVAILABLE',coverage:'UNAVAILABLE',facts:[],reason:'Access or query unavailable'}; }
export function observed(facts: CookieFacts[]): Observation { return {status:'OBSERVED',coverage:'PARTIAL',facts,reason:'Only selected store, URL and partition were queried'}; }
