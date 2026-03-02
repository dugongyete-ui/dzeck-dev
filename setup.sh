#!/bin/bash

# ============================================================
#  Vibe - Auto Setup Script
#  AI-powered development platform
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Icons
CHECK="✓"
CROSS="✗"
ARROW="→"
INFO="ℹ"
WARN="⚠"

print_header() {
  echo ""
  echo -e "${CYAN}${BOLD}============================================${RESET}"
  echo -e "${CYAN}${BOLD}   🚀 Vibe - Auto Setup Script             ${RESET}"
  echo -e "${CYAN}${BOLD}   AI-Powered Development Platform         ${RESET}"
  echo -e "${CYAN}${BOLD}============================================${RESET}"
  echo ""
}

print_step() {
  echo -e "${BLUE}${BOLD}[STEP]${RESET} $1"
}

print_success() {
  echo -e "  ${GREEN}${CHECK}${RESET} $1"
}

print_error() {
  echo -e "  ${RED}${CROSS}${RESET} $1"
}

print_warn() {
  echo -e "  ${YELLOW}${WARN}${RESET} $1"
}

print_info() {
  echo -e "  ${CYAN}${INFO}${RESET} $1"
}

print_done() {
  echo ""
  echo -e "${GREEN}${BOLD}============================================${RESET}"
  echo -e "${GREEN}${BOLD}   ${CHECK} Setup Complete!                     ${RESET}"
  echo -e "${GREEN}${BOLD}============================================${RESET}"
  echo ""
}

# ============================================================
# STEP 0: Header
# ============================================================
print_header

# ============================================================
# STEP 1: Check Node.js version
# ============================================================
print_step "Checking Node.js version..."

if ! command -v node &> /dev/null; then
  print_error "Node.js is not installed!"
  echo -e "  ${ARROW} Please install Node.js 18+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
  print_error "Node.js $NODE_VERSION detected — version 18+ required"
  echo -e "  ${ARROW} Please upgrade Node.js from https://nodejs.org"
  exit 1
fi

print_success "Node.js v$NODE_VERSION detected"

# ============================================================
# STEP 2: Check npm
# ============================================================
if ! command -v npm &> /dev/null; then
  print_error "npm is not installed!"
  exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm v$NPM_VERSION detected"

# ============================================================
# STEP 3: Check environment variables
# ============================================================
print_step "Checking environment variables..."

MISSING_VARS=()
OPTIONAL_MISSING=()

check_required() {
  local var_name=$1
  if [ -z "${!var_name}" ]; then
    MISSING_VARS+=("$var_name")
    print_error "$var_name — MISSING (required)"
  else
    print_success "$var_name — set"
  fi
}

check_optional() {
  local var_name=$1
  local note=$2
  if [ -z "${!var_name}" ]; then
    OPTIONAL_MISSING+=("$var_name")
    print_warn "$var_name — not set ($note)"
  else
    print_success "$var_name — set"
  fi
}

# Load .env file if it exists
if [ -f ".env" ]; then
  print_info "Loading .env file..."
  export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null || true
elif [ -f ".env.local" ]; then
  print_info "Loading .env.local file..."
  export $(grep -v '^#' .env.local | grep -v '^$' | xargs) 2>/dev/null || true
fi

# Required variables
check_required "DATABASE_URL"
check_required "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
check_required "CLERK_SECRET_KEY"
check_required "E2B_API_KEY"
check_required "API_KEY"
check_required "NEXT_PUBLIC_APP_URL"

# Optional but recommended
check_optional "INNGEST_API_KEY" "needed for production Inngest"
check_optional "INNGEST_SIGNING_KEY" "needed for production webhook security"
check_optional "NEXT_PUBLIC_CLERK_SIGN_IN_URL" "defaults to /sign-in"
check_optional "NEXT_PUBLIC_CLERK_SIGN_UP_URL" "defaults to /sign-up"

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo ""
  print_warn "Some required environment variables are missing!"
  echo -e "  ${ARROW} Copy env.example to .env and fill in the values:"
  echo -e "  ${ARROW} ${CYAN}cp env.example .env${RESET}"
  echo ""
  echo -e "  ${BOLD}Missing:${RESET} ${MISSING_VARS[*]}"
  echo ""
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "  Setup aborted."
    exit 1
  fi
fi

# ============================================================
# STEP 4: Setup .env file if it doesn't exist
# ============================================================
print_step "Setting up environment file..."

if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
  if [ -f "env.example" ]; then
    cp env.example .env
    print_success "Created .env from env.example — please fill in your API keys"
  else
    print_warn "No .env file found and no env.example to copy from"
  fi
else
  print_success ".env file already exists"
fi

# ============================================================
# STEP 5: Install Node.js dependencies
# ============================================================
print_step "Installing Node.js dependencies..."
echo ""

if npm install --prefer-offline 2>&1; then
  echo ""
  print_success "npm dependencies installed successfully"
else
  echo ""
  print_error "npm install failed — retrying without cache..."
  npm install 2>&1
  echo ""
  print_success "npm dependencies installed successfully"
fi

# ============================================================
# STEP 6: Generate Prisma client
# ============================================================
print_step "Generating Prisma client..."
echo ""

if npx prisma generate 2>&1; then
  echo ""
  print_success "Prisma client generated successfully"
else
  echo ""
  print_error "Prisma generate failed"
  print_warn "Make sure DATABASE_URL is set correctly"
fi

# ============================================================
# STEP 7: Run database migrations
# ============================================================
print_step "Running database migrations..."
echo ""

if [ -n "$DATABASE_URL" ]; then
  if npx prisma migrate deploy 2>&1; then
    echo ""
    print_success "Database migrations applied successfully"
  else
    echo ""
    print_warn "prisma migrate deploy failed — trying db push instead..."
    if npx prisma db push --accept-data-loss 2>&1; then
      echo ""
      print_success "Database schema pushed successfully"
    else
      echo ""
      print_error "Database setup failed"
      print_warn "Check your DATABASE_URL and database connection"
    fi
  fi
else
  print_warn "DATABASE_URL not set — skipping database migrations"
fi

# ============================================================
# STEP 8: TypeScript check
# ============================================================
print_step "Running TypeScript type check..."
echo ""

if npx tsc --noEmit 2>&1; then
  echo ""
  print_success "TypeScript check passed — no type errors"
else
  echo ""
  print_warn "TypeScript check found issues — check the output above"
fi

# ============================================================
# STEP 9: Build check (optional)
# ============================================================
print_step "Checking if the project builds successfully..."

read -p "  Run production build check? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  if npm run build 2>&1; then
    echo ""
    print_success "Production build successful"
  else
    echo ""
    print_warn "Production build failed — check the output above"
  fi
else
  print_info "Skipping build check"
fi

# ============================================================
# DONE
# ============================================================
print_done

echo -e "${BOLD}Next steps:${RESET}"
echo ""
echo -e "  1. ${CYAN}npm run dev${RESET}             — Start development server"
echo -e "  2. ${CYAN}npm run build${RESET}           — Build for production"
echo -e "  3. ${CYAN}npm start${RESET}               — Run production server"
echo ""
echo -e "${BOLD}E2B Sandbox Setup (required for AI coding):${RESET}"
echo ""
echo -e "  1. ${CYAN}npm i -g @e2b/cli${RESET}       — Install E2B CLI"
echo -e "  2. ${CYAN}e2b auth login${RESET}           — Login to E2B"
echo -e "  3. ${CYAN}cd sandbox-templates/nextjs${RESET}"
echo -e "  4. ${CYAN}e2b template build --name vibe-nextjs-test-2 --cmd \"/compile_page.sh\"${RESET}"
echo ""
echo -e "${BOLD}Documentation:${RESET} See ${CYAN}README.md${RESET} for full setup instructions"
echo ""
