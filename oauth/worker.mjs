const cookieName = "__Host-mary-oauth";
const cookie = (value, age) => cookieName+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+age;
const scriptValue = value => JSON.stringify(value).replaceAll("<","\\u003c");
const fail = (message,status=403) => new Response(message,{status,headers:{"Cache-Control":"no-store"}});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== "GET") return fail("Method not allowed",405);
    if (!["/auth","/callback"].includes(url.pathname)) return fail("Not found",404);
    const origins = (env.ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);
    if (!env.CLIENT_ID || !env.CLIENT_SECRET || !/^\d+$/.test(env.OWNER_ID) || !origins.length) return fail("OAuth configuration incomplete",503);
    const callback = url.origin+"/callback";
    if (url.pathname === "/auth") {
      const state = crypto.randomUUID();
      const login = new URL("https://github.com/login/oauth/authorize");
      login.search = new URLSearchParams({client_id:env.CLIENT_ID,redirect_uri:callback,state,scope:"public_repo"}).toString();
      return new Response(null,{status:302,headers:{Location:login.href,"Set-Cookie":cookie(state,600),"Cache-Control":"no-store"}});
    }
    const state = url.searchParams.get("state");
    const saved = (request.headers.get("Cookie") || "").split(/;\s*/).find(part=>part.startsWith(cookieName+"="))?.slice(cookieName.length+1);
    if (!state || !saved || state !== saved || !url.searchParams.get("code")) return fail("授权已取消或登录状态已过期，请重新登录。");
    const headers = {"Cache-Control":"no-store","Set-Cookie":cookie("",0),"Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
    try {
      const response = await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json"},body:JSON.stringify({client_id:env.CLIENT_ID,client_secret:env.CLIENT_SECRET,code:url.searchParams.get("code"),redirect_uri:callback})});
      const {access_token:token} = await response.json();
      if (!response.ok || !token) throw Error();
      const apiHeaders = {Authorization:"Bearer "+token,"User-Agent":"Mary-Group-CMS",Accept:"application/vnd.github+json"};
      const user = await fetch("https://api.github.com/user",{headers:apiHeaders});
      if (!user.ok || String((await user.json()).id) !== env.OWNER_ID) throw Error();
      const repo = await fetch("https://api.github.com/repos/"+env.REPOSITORY,{headers:apiHeaders});
      if (!repo.ok || !(await repo.json()).permissions?.push) throw Error();
      const nonce = crypto.randomUUID();
      headers["Content-Type"]="text/html; charset=utf-8";
      headers["Content-Security-Policy"]="default-src 'none'; script-src 'nonce-"+nonce+"'; frame-ancestors 'none'; base-uri 'none'";
      return new Response(`<!doctype html><meta charset="utf-8"><p>正在返回文章管理后台。若原窗口已关闭，请重新登录。</p><script nonce="${nonce}">
        const origins=${scriptValue(origins)};
        function receive(e) {
          if(e.source!==window.opener || !origins.includes(e.origin) || e.data!=="authorizing:github") return;
          removeEventListener("message",receive);
          window.opener.postMessage(${scriptValue("authorization:github:success:"+JSON.stringify({token,provider:"github"}))},e.origin);
        }
        addEventListener("message",receive);
        for(const origin of origins) window.opener?.postMessage("authorizing:github",origin);
      </script>`,{headers});
    } catch {
      return new Response("登录失败。请核对站长账号、仓库写权限和 OAuth 配置。",{status:403,headers});
    }
  }
};
