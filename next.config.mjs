/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // @react-pdf/renderer embarca o pdfkit, que lê seus arquivos de métrica de
  // fonte (.afm) do disco em caminhos relativos ao próprio pacote. Se o
  // webpack empacotar esse código (comportamento padrão), esses caminhos
  // quebram em produção (Vercel) mesmo funcionando em `next dev`. Mantendo o
  // pacote "externo", ele continua sendo um require() normal do node_modules,
  // que o tracer de arquivos da Vercel inclui corretamente.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
