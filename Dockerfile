# Static site served by nginx — turnkey for Coolify's "Dockerfile" build pack.
FROM nginx:1.27-alpine

# custom server config (clean URLs, gzip, asset caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copy the site into nginx's web root
COPY . /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
