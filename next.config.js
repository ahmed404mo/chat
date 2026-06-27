const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  sassOptions: {
    includePaths: [path.join(__dirname, "node_modules")],
    silenceDeprecations: ["import", "legacy-js-api"],
  },
};

module.exports = nextConfig;
