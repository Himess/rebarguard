@echo off
REM Windows entry point — invokes the WSL setup script.
REM Double-click or run from cmd.exe / PowerShell.

wsl -d Ubuntu-22.04 -- bash /mnt/c/Users/USER/Desktop/RebarGuard/scripts/setup-hermes.sh
pause
