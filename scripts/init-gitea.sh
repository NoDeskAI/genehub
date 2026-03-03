#!/usr/bin/env bash
set -euo pipefail

GITEA_URL="${GITEA_URL:-http://localhost:3001}"
GITEA_ADMIN_USER="${GITEA_ADMIN_USER:-genehub}"
GITEA_ADMIN_PASSWORD="${GENEHUB_ADMIN_TOKEN:-admin-dev-token}"
GITEA_ADMIN_EMAIL="${GITEA_ADMIN_EMAIL:-admin@genehub.local}"
GITEA_ORG="${GITEA_ORG:-genes}"

wait_for_gitea() {
  echo "Waiting for Gitea at ${GITEA_URL}..."
  for i in $(seq 1 60); do
    if curl -fsS "${GITEA_URL}/api/v1/version" >/dev/null 2>&1; then
      echo "Gitea is ready."
      return 0
    fi
    sleep 2
  done
  echo "ERROR: Gitea did not become ready in time."
  exit 1
}

create_admin() {
  echo "Creating admin user '${GITEA_ADMIN_USER}'..."
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "${GITEA_URL}/api/v1/admin/users" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"${GITEA_ADMIN_EMAIL}\",
      \"full_name\": \"GeneHub Admin\",
      \"login_name\": \"${GITEA_ADMIN_USER}\",
      \"must_change_password\": false,
      \"password\": \"${GITEA_ADMIN_PASSWORD}\",
      \"send_notify\": false,
      \"username\": \"${GITEA_ADMIN_USER}\",
      \"visibility\": \"public\"
    }")

  if [ "$status" = "201" ]; then
    echo "Admin user created."
  elif [ "$status" = "422" ]; then
    echo "Admin user already exists, skipping."
  else
    echo "WARNING: Unexpected status $status when creating admin user."
  fi
}

create_org() {
  echo "Creating organization '${GITEA_ORG}'..."
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "${GITEA_ADMIN_USER}:${GITEA_ADMIN_PASSWORD}" \
    "${GITEA_URL}/api/v1/orgs" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"${GITEA_ORG}\",
      \"full_name\": \"GeneHub Genes\",
      \"description\": \"Gene repository storage\",
      \"visibility\": \"public\"
    }")

  if [ "$status" = "201" ]; then
    echo "Organization created."
  elif [ "$status" = "422" ]; then
    echo "Organization already exists, skipping."
  else
    echo "WARNING: Unexpected status $status when creating organization."
  fi
}

wait_for_gitea
create_admin
create_org

echo "Gitea initialization complete."
