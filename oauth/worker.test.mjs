import test from "node:test";
import assert from "node:assert/strict";
import worker from "./worker.mjs";

test("OAuth callback validates browser state, owner, and repository access", async () => {
  const env = {CLIENT_ID:"test", CLIENT_SECRET:"fixture", OWNER_ID:"17", REPOSITORY:"longy3/Mary-Group", ALLOWED_ORIGINS:"https://longy3.github.io"};
  const origin = "https://worker.example";
  const login = await worker.fetch(new Request(origin+"/auth"),env);
  const authorize = new URL(login.headers.get("location"));
  assert.equal(authorize.searchParams.get("redirect_uri"),origin+"/callback");
  assert.equal(authorize.searchParams.get("scope"),"public_repo");
  const state = authorize.searchParams.get("state");
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const callback = (value) => new Request(origin+"/callback?code=fixture&state="+value,{headers:{Cookie:cookie}});
  assert.equal((await worker.fetch(callback("incorrect"),env)).status,403);
  const original = globalThis.fetch;
  let owner = 19, push = true;
  globalThis.fetch = async (url) => {
    if (url === "https://github.com/login/oauth/access_token") return Response.json({access_token:"dummy-value"});
    if (url === "https://api.github.com/user") return Response.json({id:owner});
    assert.equal(url,"https://api.github.com/repos/longy3/Mary-Group");
    return Response.json({permissions:{push}});
  };
  try {
    assert.equal((await worker.fetch(callback(state),env)).status,403);
    owner = 17; push = false;
    assert.equal((await worker.fetch(callback(state),env)).status,403);
    push = true;
    const ok = await worker.fetch(callback(state),env);
    assert.equal(ok.status,200);
    assert.equal(ok.headers.get("Cache-Control"),"no-store");
    assert.match(ok.headers.get("set-cookie"),/Max-Age=0/);
    assert.match(await ok.text(),/authorization:github:success:/);
  } finally { globalThis.fetch = original; }
});
