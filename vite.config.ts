import { defineConfig, loadEnv, type Plugin } from "vite";

function originTrialMetaInjector(token: string): Plugin {
  return {
    name: "origin-trial-meta-injector",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace(/%OT_TOKEN%/g, token);
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const otToken = env.OT_TOKEN ?? "";
  const basePath = env.BASE_PATH ?? "/";

  const targetSite = {
    url: env.TARGET_URL ?? "https://example.com",
    name: env.TARGET_NAME ?? "Live Site",
    title: env.TARGET_TITLE ?? "내 사이트,\\n바로 입장",
    sub: env.TARGET_SUB ?? "원하는 어떤 URL이든 큐브 안에 띄울 수 있어요.",
    chips: env.TARGET_CHIPS ?? "3D · HTML in Canvas · Vite",
    ctaLabel: env.TARGET_CTA_LABEL ?? "입장",
    tagline: env.TARGET_TAGLINE ?? "3D 사이트 큐브"
  };

  return {
    base: basePath,
    plugins: [originTrialMetaInjector(otToken)],
    define: {
      __OT_TOKEN__: JSON.stringify(otToken),
      __APP_VERSION__: JSON.stringify(env.npm_package_version ?? "dev"),
      __TARGET_SITE__: JSON.stringify(targetSite)
    },
    build: {
      target: "es2022",
      cssTarget: "chrome112",
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules/three")) return "three";
          }
        }
      }
    },
    server: {
      port: 5173,
      strictPort: false
    },
    test: {
      environment: "happy-dom",
      include: ["src/**/*.test.ts"]
    }
  };
});
