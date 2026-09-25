const api = process.env.API_URL || "http://127.0.0.1:3001";
const client = process.env.CLIENT_URL || "http://127.0.0.1:5173";
export default {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/panel/:path*", destination: `${client}/:path*` },
    ];
  },
};
