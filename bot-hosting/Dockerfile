# Generic Node bot host — build from bot-hosting/
FROM node:20-alpine
WORKDIR /app
COPY node-example/package.json ./
RUN npm install --omit=dev
COPY node-example/ ./
ENV NODE_ENV=production
CMD ["npm", "start"]
