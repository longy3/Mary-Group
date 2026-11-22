(() => {
  const { base, worker, dirs, local } = window.blogAdmin;
  const demo = local && ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("demo");
  if (!worker && !demo) {
    document.querySelector("#status").textContent = "站长登录尚待配置。请在构建环境中填写 PUBLIC_CMS_OAUTH_ORIGIN 并重新构建。";
    if (local) {
      const link = document.createElement("a");
      link.href = "?demo=1";
      link.textContent = "体验临时编辑器（仅测试数据）";
      document.querySelector("#setup").append(link);
    }
    return;
  }
  const fields = [
    {name:"title",label:"标题",widget:"string"},
    {name:"description",label:"摘要",widget:"text",required:false},
    {name:"published",label:"发布日期",widget:"datetime",date_format:"YYYY-MM-DD",time_format:false,format:"YYYY-MM-DD"},
    {name:"updated",label:"修改日期",widget:"datetime",date_format:"YYYY-MM-DD",time_format:false,format:"YYYY-MM-DD",required:false},
    {name:"draft",label:"草稿（开启后从网站撤下）",widget:"boolean",hint:"开启后点击「立即发布」会保存为草稿。关闭并保存才会在博客展示。",default:true,required:false},
    {name:"image",label:"封面",widget:"image",required:false},
    {name:"category",label:"分类",widget:"string",required:false},
    {name:"tags",label:"标签",widget:"list",required:false},
    {name:"lang",label:"文章语言",widget:"string",required:false},
    {name:"body",label:"正文",widget:"markdown",default_mode:"rich_text"},
  ];
  const collections = [...new Set(["", ...dirs])].map((dir, index) => ({
    name: index ? "folder_"+index : "posts",
    label: dir ? "文章 · "+dir : "文章",
    folder: ["src/content/posts",dir].filter(Boolean).join("/"),
    create: !dir, delete:true, format:"frontmatter",extension:"md",fields,
    slug:"{{year}}-{{month}}-{{day}}-{{slug}}",
  }));
  const preview = ({entry,widgetFor,getAsset}) => {
    const data = entry.get("data");
    const cover = data.get("image");
    const image = cover && getAsset(cover);
    return h("article",{},h("h1",{},data.get("title")),h("p",{},data.get("description")),image && h("img",{src:String(image),alt:"文章封面"}),widgetFor("body"));
  };
  collections.forEach(collection => CMS.registerPreviewTemplate(collection.name,preview));
  CMS.registerPreviewStyle(base+"/admin/preview.css");
  document.querySelector("#setup").remove();
  CMS.init({config:{
    load_config_file:false,locale:"zh_Hans",display_url:location.origin+base+"/",
    backend:demo ? {name:"test-repo"} : {name:"github",repo:"longy3/Mary-Group",branch:"main",base_url:new URL(worker).origin,auth_endpoint:"auth",auth_scope:"public_repo"},
    media_folder:"public/uploads",public_folder:"/uploads",slug:{encoding:"unicode"},collections,
  }});
})();
