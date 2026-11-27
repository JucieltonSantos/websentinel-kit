import {describe,it,expect} from 'vitest';
import {projectCookie, observed, unavailable} from '../projection';
const cookie = (name:string,httpOnly:boolean,secure:boolean) => ({name,httpOnly,secure,value:'CANARY_COOKIE_VALUE',domain:'CANARY_DOMAIN',path:'CANARY_PATH',partitionKey:{topLevelSite:'CANARY_PARTITION'}});
describe('cookie projection', () => {
  it.each(['session','SESSIONID','JSESSIONID','PHPSESSID','ASP.NET_SESSIONID','SID','SESS','CONNECT.SID'])('recognizes %s exactly ignoring case', name => expect(projectCookie(cookie(name,true,true)).candidate).toBe(true));
  it.each(['session_id','my-session','unknown',' session','session '])('does not classify %s', name => expect(projectCookie(cookie(name,false,false)).candidate).toBe(false));
  it.each([[true,true],[true,false],[false,true],[false,false]])('projects flags %s %s only', (httpOnly,secure) => {
    const result = projectCookie(cookie('session',httpOnly,secure));
    expect(result).toEqual({candidate:true,httpOnly,secure});
    expect(JSON.stringify(result)).not.toMatch(/CANARY|session/i);
  });
  it('distinguishes an empty partial observation from unavailable', () => {
    expect(observed([])).toMatchObject({status:'OBSERVED',coverage:'PARTIAL',facts:[]});
    expect(unavailable()).toMatchObject({status:'UNAVAILABLE',coverage:'UNAVAILABLE',facts:[]});
  });
});
