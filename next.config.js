const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    includePaths: [path.join(__dirname, "node_modules")],
    silenceDeprecations: ["import", "legacy-js-api"],
  },
};

module.exports = nextConfig;
