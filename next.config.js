/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['uploadthing.com', 'utfs.io'],
  },
  serverExternalPackages: ['svix'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  // Optimize webpack configuration
  webpack: (config, { isServer }) => {
    // Reduce cache serialization issues
    config.cache = {
      type: 'filesystem',
      compression: 'gzip',
      // Increase cache size limits
      maxMemoryGenerations: 1,
      memoryCacheUnaffected: true,
    };
    
    // Optimize for large PDF.js library
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'pdfjs-dist/build/pdf.worker.min.js': false,
      };
    }
    
    return config;
  },
  // Increase timeout for compilation
  staticPageGenerationTimeout: 120,
  // Reduce memory usage
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig