#!/bin/sh
# RecursivePraxis CLI installer for macOS and Linux.
#
# This installs the `lambda` executable and nothing else. It does not touch
# any host agent: no .claude/, no .cursor/, no .agents/, no .opencode/.
# Nothing reaches a host agent until a human runs `lambda init`.
#
# Read before running:
#   curl -fsSLO https://raw.githubusercontent.com/flyingcoder/RecursivePraxis/main/install.sh
#   less install.sh && sh install.sh
#
# Pin a version (recommended in CI):
#   LAMBDA_VERSION=v0.2.0 sh install.sh
#
# Uninstall the CLI:
#   sh install.sh --uninstall
#
# No sudo, ever. Everything lands under $HOME. If you want it elsewhere, set
# LAMBDA_BIN_DIR rather than escalating privileges.

set -eu

REPO="${LAMBDA_REPO:-flyingcoder/RecursivePraxis}"
INSTALL_DIR="${LAMBDA_INSTALL_DIR:-$HOME/.recursive-praxis-cli}"
BIN_DIR="${LAMBDA_BIN_DIR:-$HOME/.local/bin}"
MIN_NODE_MAJOR=20

info()  { printf '%s\n' "$*"; }
warn()  { printf 'warning: %s\n' "$*" >&2; }
fatal() { printf 'error: %s\n' "$*" >&2; exit 1; }

# --- uninstall ---------------------------------------------------------------

uninstall() {
  removed=0
  if [ -e "$BIN_DIR/lambda" ] || [ -L "$BIN_DIR/lambda" ]; then
    rm -f "$BIN_DIR/lambda"
    info "removed $BIN_DIR/lambda"
    removed=1
  fi
  if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    info "removed $INSTALL_DIR"
    removed=1
  fi
  [ "$removed" -eq 0 ] && info "nothing to remove (no $BIN_DIR/lambda, no $INSTALL_DIR)"

  cat <<'EOF'

Host-agent files were NOT touched. There were two installs, so there are two
removals: this script removed the CLI; `lambda uninstall` removes the skill and
command files it generated into .claude/, .cursor/, .agents/, and .opencode/.
Run that first if you have not already — it needs the binary this just deleted.
EOF
  exit 0
}

[ "${1:-}" = "--uninstall" ] && uninstall

# --- 1. detect platform ------------------------------------------------------

os="$(uname -s)"
arch="$(uname -m)"

case "$os" in
  Darwin) os_id="darwin" ;;
  Linux)  os_id="linux" ;;
  *) fatal "unsupported operating system: $os (this installer handles Darwin and Linux; on Windows use install.ps1)" ;;
esac

case "$arch" in
  arm64|aarch64) arch_id="arm64" ;;
  x86_64|amd64)  arch_id="x64" ;;
  *) fatal "unsupported architecture: $arch (expected arm64/aarch64 or x86_64/amd64)" ;;
esac

target="${os_id}-${arch_id}"

# The current release artifact runs on the system Node rather than bundling
# its own runtime, so Node is a hard requirement. Checked here rather than at
# first run, so the failure names the cause instead of surfacing as a syntax
# error from an old parser.
command -v node >/dev/null 2>&1 || fatal "node is required (>= $MIN_NODE_MAJOR) and was not found on PATH"
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$node_major" -ge "$MIN_NODE_MAJOR" ] || fatal "node >= $MIN_NODE_MAJOR is required; found $(node -v)"

# --- 2. resolve version ------------------------------------------------------

version="${LAMBDA_VERSION:-}"
if [ -z "$version" ]; then
  # The releases/latest redirect avoids the GitHub API's unauthenticated rate
  # limit, which is low enough to bite a CI job that installs on every run.
  version="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" 2>/dev/null | sed 's|.*/tag/||')"
fi
if [ -z "$version" ] || [ "$version" = "https://github.com/$REPO/releases/latest" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1)"
fi
[ -n "$version" ] || fatal "could not resolve the latest release; set LAMBDA_VERSION explicitly"

case "$version" in
  v*) ;;
  *) version="v$version" ;;
esac

# --- 3. download and verify --------------------------------------------------

tarball="lambda-${target}.tar.gz"
base="https://github.com/$REPO/releases/download/$version"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM

info "installing lambda $version ($target)"
curl -fsSL "$base/$tarball" -o "$tmp/$tarball" || fatal "download failed: $base/$tarball"
curl -fsSL "$base/SHA256SUMS" -o "$tmp/SHA256SUMS" || fatal "download failed: $base/SHA256SUMS"

# Fail closed on a hash mismatch. HTTPS alone authenticates the host, not the
# artifact, and this is the one place where copying a reference installer that
# verifies nothing would be the wrong call.
expected="$(grep " \{1,2\}\*\{0,1\}$tarball\$" "$tmp/SHA256SUMS" | awk '{print $1}' | head -n 1)"
[ -n "$expected" ] || fatal "$tarball is not listed in SHA256SUMS for $version — refusing to install"

if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$tmp/$tarball" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  actual="$(shasum -a 256 "$tmp/$tarball" | awk '{print $1}')"
else
  fatal "neither sha256sum nor shasum is available; cannot verify the download"
fi

[ "$actual" = "$expected" ] || fatal "checksum mismatch for $tarball
  expected $expected
  actual   $actual
Refusing to install. Re-run, and if it persists, report it rather than bypassing this check."

mkdir -p "$tmp/extract"
tar -xzf "$tmp/$tarball" -C "$tmp/extract" || fatal "could not extract $tarball"
[ -x "$tmp/extract/bin/lambda" ] || fatal "$tarball did not contain bin/lambda"

# --- 4. place ----------------------------------------------------------------

dest="$INSTALL_DIR/versions/$version"
mkdir -p "$INSTALL_DIR/versions"
rm -rf "$dest"
mv "$tmp/extract" "$dest"
chmod +x "$dest/bin/lambda"

# --- 5. link -----------------------------------------------------------------

mkdir -p "$BIN_DIR"
ln -sfn "$dest" "$INSTALL_DIR/current"
ln -sfn "$dest/bin/lambda" "$BIN_DIR/lambda"

# --- 6. prune older versions -------------------------------------------------

for dir in "$INSTALL_DIR"/versions/*; do
  [ -d "$dir" ] || continue
  [ "$dir" = "$dest" ] && continue
  rm -rf "$dir"
done

# --- 7. verify PATH ----------------------------------------------------------

info "installed to $dest"
info "linked      $BIN_DIR/lambda"

case ":${PATH}:" in
  *":$BIN_DIR:"*) ;;
  *) warn "$BIN_DIR is not on your PATH. Add it, e.g.:
    echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.profile" ;;
esac

shadow="$(command -v lambda 2>/dev/null || true)"
if [ -n "$shadow" ] && [ "$shadow" != "$BIN_DIR/lambda" ]; then
  warn "another 'lambda' earlier on PATH will shadow this one: $shadow"
fi

cat <<EOF

Installed the CLI and nothing else — no host agent was touched.

Next:  lambda init      configure host agents (four questions)
       lambda doctor    verify an existing install
EOF
