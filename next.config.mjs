/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // @react-pdf/renderer embarca o pdfkit, que carrega as fontes padrão (Helvetica
  // etc.) via um subpath import dinâmico do próprio pacote (`#standard-fonts/*`).
  // O empacotamento do webpack não resolve isso corretamente, então o pacote
  // precisa ficar "externo" (require() normal do node_modules em vez de bundle).
  serverExternalPackages: ["@react-pdf/renderer"],
  // Mesmo externo, o rastreador de arquivos da Vercel (@vercel/nft) não consegue
  // enxergar esse require dinâmico em tempo de build e não inclui os .cjs das
  // fontes no pacote da função — resultando em "Cannot find module
  // .../pdfkit/js/standard-fonts/Helvetica.cjs" em produção. Força a inclusão
  // explícita desses arquivos na função que gera o PDF.
  outputFileTracingIncludes: {
    "/api/propostas/[id]/gerar-pdf": [
      "./node_modules/pdfkit/js/standard-fonts/**/*",
      "./node_modules/pdfkit/js/data/**/*",
    ],
  },
};

export default nextConfig;
