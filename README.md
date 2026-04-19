# FinTrack — Personal Finance Manager

> A full-stack personal finance web application with automated CI/CD deployment on AWS EC2.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-18-green?style=flat-square&logo=node.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat-square&logo=docker)
![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?style=flat-square&logo=amazon-aws)
![CI/CD](https://img.shields.io/badge/CI/CD-GitHub_Actions-2088FF?style=flat-square&logo=github-actions)

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| 🚀 Live App | http://13.233.174.46 |
| 📊 Prometheus | http://13.233.174.46:9090 |
| 📈 Grafana | http://13.233.174.46:3001 |

---

## 📌 Project Overview

FinTrack is a production-grade full-stack web application that helps users track their personal income and expenses, set monthly budgets by category, and visualize spending patterns with real-time charts.

The project demonstrates a complete **End-to-End DevOps pipeline** — from writing code locally to automated testing, Docker containerization, security scanning, and zero-touch deployment to AWS EC2 using GitHub Actions.

---

##  Features

### 🔐 Authentication
- Email + password registration and login
- JWT-based authentication via Supabase Auth
- Row Level Security — each user sees only their own data
- Edit profile (update display name)

### 📊 Dashboard
- Net balance, total income, total expense cards
- Doughnut chart — income vs expense breakdown
- Bar chart — spending by category
- Dark / Light mode toggle

### 💳 Transactions
- Add income or expense with description, amount, category, and month
- Monthly filter to view specific month's data
- Search transactions by description
- Category filter chips (Salary, Food, Rent, Transport, etc.)
- Delete transactions

### 🎯 Budget Planner
- Set your own total monthly budget
- Set per-category spending limits
- Progress bars with color coding (green → yellow → red)
- Budget exceeded warning at 80%+
- Overall budget percentage tracker

### 📅 Smart Sidebar
- Daily spending limit calculator (remaining balance ÷ days left)
- Today's total spending display
- Recent 3 transactions preview
- Days left in current month

### 📈 Monitoring
- Prometheus metrics endpoint at `/metrics`
- Grafana dashboard with live charts
- Container uptime monitoring
- Request tracking

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 | React framework, SSR, routing |
| Backend | Node.js + Express | REST API server |
| Database | Supabase (PostgreSQL) | Cloud DB with built-in auth |
| Auth | Supabase JWT | Token-based authentication |
| Styling | Inline CSS + CSS Variables | Dark/light theme support |
| Charts | Chart.js + react-chartjs-2 | Doughnut and bar charts |
| Container | Docker + Docker Compose | App containerization |
| Registry | Docker Hub | Docker image storage |
| Cloud | AWS EC2 (t2.micro) | Production server |
| CI/CD | GitHub Actions | Automated pipeline |
| Security | Trivy | Docker image CVE scanning |
| Monitoring | Prometheus + Grafana | Metrics and dashboards |

---

##  System Architecture

The app follows a microservices architecture with the following flow:

- **Developer** pushes code to GitHub
- **GitHub Actions** triggers the CI/CD pipeline automatically
- Pipeline builds Docker images and pushes to a private **Docker Hub** registry
- Pipeline SSHs into **AWS EC2** and deploys the latest containers
- **Supabase** (PostgreSQL) handles database and authentication in the cloud
- **Prometheus + Grafana** monitor all running containers

```
Developer → GitHub → GitHub Actions → Docker Hub
                                           │
                                      AWS EC2
                                    ┌────────────┐
                                    │ frontend:80│
                                    │ backend    │
                                    │ grafana    │
                                    │ prometheus │
                                    └─────┬──────┘
                                          │
                                    Supabase Cloud
                                    (PostgreSQL DB)
```

---

## ⚙️ CI/CD Pipeline

The pipeline is defined in `.github/workflows/deploy.yml` and runs automatically on every push to `main`.

```
Push to main
     │
     ▼
┌──────────────────────────────────────┐
│          Build & Push Images         │
│  1. Login to Docker Hub              │
│  2. Build backend image              │
│  3. Build frontend image             │
│     (inject Supabase env vars)       │
│  4. Push both images to Docker Hub   │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│            Deploy to EC2             │
│  1. SCP docker-compose.yml to EC2    │
│  2. SSH into EC2                     │
│  3. docker pull latest images        │
│  4. docker stop old containers       │
│  5. docker-compose up -d             │
│  6. docker image prune               │
└──────────────────────────────────────┘
```

### GitHub Secrets Required

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `EC2_HOST` | AWS EC2 public IP address |
| `EC2_SSH_KEY` | EC2 private key (.pem contents) |
| `REACT_APP_SUPABASE_URL` | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase publishable key |

---

## 📁 Project Structure

```
expense-tracker/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── frontend/                   # Next.js app
│   ├── components/
│   │   ├── Auth.js             # Login/Register page
│   │   └── Dashboard.js        # Main dashboard
│   ├── lib/
│   │   └── supabase.js         # Supabase client
│   ├── pages/
│   │   ├── _app.js             # App wrapper with auth
│   │   ├── index.js            # Root route
│   │   └── dashboard.js        # Dashboard route
│   ├── styles/
│   │   └── globals.css         # Global styles
│   ├── Dockerfile              # Frontend container
│   └── package.json
├── backend/                    # Node.js API
│   ├── app.js                  # Express server
│   ├── Dockerfile              # Backend container
│   └── package.json
├── nginx/
│   └── nginx.conf              # Reverse proxy config
├── docker-compose.yml          # Multi-container setup
└── README.md
```

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- Docker Desktop
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ADNAN-ZEYA/Expense-Tracker.git
cd Expense-Tracker
```

### 2. Set up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run this SQL in the SQL Editor:

```sql
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  type text not null,
  category text not null,
  month text not null,
  date text not null,
  created_at timestamp default now()
);

alter table transactions enable row level security;

create policy "Users can only see own transactions"
on transactions for all
using (auth.uid() = user_id);

create table budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  month text not null,
  category text not null,
  limit_amount numeric not null,
  created_at timestamp default now(),
  unique(user_id, month, category)
);

alter table budgets enable row level security;

create policy "Users can manage own budgets"
on budgets for all
using (auth.uid() = user_id);
```

### 3. Configure environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

### 5. Run the backend

```bash
cd backend
npm install
node app.js
```

Backend runs at `http://localhost:5000`

---

## 🐳 Docker Setup

### Run with Docker Compose

```bash
# Build and run all containers
docker-compose up -d

# Check running containers
docker ps

# View logs
docker logs frontend
docker logs backend

# Stop containers
docker-compose down
```

### Build images manually

```bash
# Backend
docker build -t expense-backend ./backend

# Frontend
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  -t expense-frontend ./frontend
```

---

## ☁️ AWS EC2 Deployment

### Server Setup

```bash
sudo apt update -y
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

### Deploy

```bash
# Pull latest images
docker pull your-dockerhub-username/expense-frontend:latest
docker pull your-dockerhub-username/expense-backend:latest

# Start containers
docker-compose up -d

# Verify
docker ps
```

### EC2 Security Group Ports

| Port | Service |
|---|---|
| 22 | SSH |
| 80 | Web App |
| 9090 | Prometheus |
| 3001 | Grafana |

---

## 📊 Monitoring Setup

### Prometheus

Access at `http://YOUR_EC2_IP:9090`

Useful queries:
- `up` — check which targets are up
- `app_requests_total` — total request count

### Grafana

Access at `http://YOUR_EC2_IP:3001`

Login: `admin` / `admin123`

1. Add Prometheus data source: `http://prometheus:9090`
2. Create dashboards from metrics

---

## 🔒 Security

- **Supabase RLS** — Row Level Security ensures users only access their own data
- **JWT Auth** — All API calls authenticated with short-lived tokens
- **Trivy Scanning** — Docker images scanned for CVEs in CI pipeline
- **Environment Variables** — All secrets stored in GitHub Secrets, never in code
- **SSH Key Auth** — EC2 access only via private key, no password auth

---

## 🗺️ Roadmap

- [ ] Mobile responsive design
- [ ] Export transactions to PDF / Excel
- [ ] Recurring transaction automation
- [ ] Email alerts when budget exceeded
- [ ] Savings goals tracker
- [ ] Multi-currency support
- [ ] Bank statement upload and auto-categorize

---

## 👨‍💻 Author

**Adnan Zeya**
- GitHub: [@ADNAN-ZEYA](https://github.com/ADNAN-ZEYA)
- Email: adnanzeya5@gmail.com

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> Built as an End-to-End DevOps project demonstrating CI/CD automation, containerization, cloud deployment, and full-stack development.