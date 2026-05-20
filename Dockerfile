FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV PORT=5000
ENV DATABASE_URL=postgresql://passmark:passmark@postgres:5432/passmark

RUN npm run db:generate

EXPOSE 5000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run web"]
