FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server ./server
COPY public ./public
COPY test ./test
COPY README.md ./.gitignore .env.example ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm","start"]
