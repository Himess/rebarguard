#!/usr/bin/env bash
# Install Hermes Agent plugins that complement the RebarGuard agent debate.
#
# Plugins are Git-installed extensions to the CLI itself; each one can ship
# new commands, MCP servers, hook handlers, or skill bundles. Hermes resolves
# them via `hermes plugins install <git-url>` or `hermes plugins install
# owner/repo` (GitHub shorthand).
#
# Run inside the live container:
#   fly ssh console -a rebarguard-api
#   bash /opt/hermes-config/install-plugins.sh
#
# Or locally:
#   bash scripts/install-plugins.sh

set -euo pipefail

# Each entry is `owner/repo` or a full Git URL. Plugins listed here are
# *recommended* additions for a RebarGuard operator; we don't force them on
# every deploy because they add image weight and 3rd-party trust surface.
RECOMMENDED=(
  # Add upstream Hermes Agent plugins here as they become useful, e.g.:
  # NousResearch/hermes-plugin-vision-tools
  # NousResearch/hermes-plugin-pdf-tools
)

if [ "${#RECOMMENDED[@]}" -eq 0 ]; then
  echo "No third-party plugins recommended yet."
  echo "RebarGuard's own framework integration is via:"
  echo "  - skills:    /opt/hermes-skills/rebarguard/"
  echo "  - hooks:     /opt/hermes-config/cli-config.yaml"
  echo "  - cron:      bash /opt/hermes-config/install-cron.sh"
  echo "  - mcp serve: bash scripts/run-mcp.sh"
  echo ""
  echo "To browse community plugins: hermes plugins list (also see"
  echo "https://github.com/NousResearch/hermes-agent for the official catalog)."
  exit 0
fi

for plugin in "${RECOMMENDED[@]}"; do
  if hermes plugins list 2>/dev/null | grep -q "$plugin"; then
    echo "plugin[$plugin] already installed, skipping"
    continue
  fi
  echo "Installing plugin: $plugin"
  hermes plugins install "$plugin"
done

echo "All plugins installed:"
hermes plugins list
