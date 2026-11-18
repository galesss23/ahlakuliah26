import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_URL = rawUrl.includes("adreqfeforuibewzctku.supabase.co") ? "" : rawUrl.trim();
const SUPABASE_KEY = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || "").trim();

const supabase = (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL.startsWith("http")) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;


async function startServer() {
  console.log("Starting server initialization...");
  const app = express();
  const PORT = 3000;

  // Bind port immediately to avoid "Please wait..." hang
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server is listening on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite in development mode...");
    try {
      vite = await createViteServer({
        server: { middlewareMode: true }
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached.");
    } catch (viteError) {
      console.error("Failed to create Vite server:", viteError);
    }
  } else {
    console.log("Running in production mode.");
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let template: string;
      if (process.env.NODE_ENV !== "production" && vite) {
        template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
      } else if (fs.existsSync(path.resolve(__dirname, "dist/index.html"))) {
        template = fs.readFileSync(path.resolve(__dirname, "dist/index.html"), "utf-8");
      } else {
        template = "<html><body><h1>Loading...</h1><script>setTimeout(()=>location.reload(), 2000)</script></body></html>";
      }

      // Fetch dynamic settings from Supabase
      let ogImage = "https://drive.google.com/uc?export=view&id=1FgxEMTBl4n8asyL_YDcmkwhsZr4YCFuC";
      let appName = "Emye Edu - Ujian Online";
      
      if (supabase) {
        try {
          const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle();
          if (data) {
            ogImage = data.og_image_url || data.ogImageUrl || ogImage;
            appName = data.app_name || data.appName || appName;
          }
        } catch (e) {
          // Cloud not reachable or table not populated, use default tags
        }
      }

      // Inject meta tags
      const html = template
        .replace(/<title>.*?<\/title>/, `<title>${appName}</title>`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${appName}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/, `<meta property="og:image" content="${ogImage}" />`)
        .replace(/<meta property="og:image:secure_url" content=".*?" \/>/, `<meta property="og:image:secure_url" content="${ogImage}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${appName}" />`)
        .replace(/<meta name="twitter:image" content=".*?" \/>/, `<meta name="twitter:image" content="${ogImage}" />`)
        .replace(/<link rel="image_src" href=".*?" \/>/, `<link rel="image_src" href="${ogImage}" />`);

      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      if (process.env.NODE_ENV !== "production" && vite) {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });
}

startServer();
