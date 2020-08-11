FROM node:12-alpine
CMD ["/usr/local/bin/node", "index.js"]
WORKDIR /home/node

COPY --chown=node:node . build

RUN apk add -U --no-cache --virtual .build-deps git sudo \
  && sudo -u node rm -rf build/node_modules \
  && sudo -u node sh -c 'cd build && npm ci --ignore-scripts && npm run build' \
  && sudo -u node cp -r build/package-lock.json package.json build/dist/* . \
  && sudo -u node sh -c 'npm ci --ignore-scripts --production' \  
  && sudo -u node npm cache clean -f \
  && apk del .build-deps \
  && rm -rf build tmp/* /var/cache/apk/*

USER node