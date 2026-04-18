# RebarGuard — Scripts

Operational helpers. All shell scripts are `bash` and assume Unix line endings.

## `setup-hermes.sh`

Installs the Hermes Agent framework (if missing) and runs `hermes setup` interactively
to sign in with your Nous Portal subscription. Must be run inside **WSL2 Ubuntu** on
Windows (native Windows is not supported by the framework).

```bash
# From a WSL2 shell at the project root
bash scripts/setup-hermes.sh
```

After this, the `hermes` CLI is available inside WSL, and our backend can invoke it via
`wsl -d Ubuntu-22.04 -- hermes ...` when `HERMES_CLI_VIA_WSL=true` is set in
`backend/.env`.

## Verifying the setup

```bash
# From WSL:
hermes --version
hermes model
hermes run --help
```

```bash
# From Windows bash (our backend's perspective):
wsl -d Ubuntu-22.04 -- hermes --version
```

## If something goes wrong

- `hermes: command not found` inside WSL after install → `export PATH="$HOME/.local/bin:$HOME/.hermes/hermes-agent/bin:$PATH"` then retry. Add the line to `~/.bashrc` to persist.
- Install script errors on `sudo apt install` → run `sudo apt update && sudo apt install -y ripgrep` beforehand.
- `hermes setup` fails to open a browser → copy the login URL from the terminal output and open it manually in Windows.
