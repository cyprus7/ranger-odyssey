FROM node:22-alpine
WORKDIR /app

# copy manifest and install deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# copy app code
COPY src ./src

ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/index.js"]
