#!/usr/bin/env python3
"""
Simple Raspberry Pi LCD video client example.

This script polls the server for LCD commands and executes them using an available
command-line player (cvlc/mpv/omxplayer). It is intentionally simple and meant as a
starting point. Improve it with a robust supervisor (systemd), WebSockets, auth,
and safety checks for production.

Usage:
  1) Install a player, e.g. vlc (cvlc) or mpv or omxplayer.
     On Raspberry Pi OS (buster/stretch): sudo apt install vlc or sudo apt install mpv
  2) Update SERVER_URL and TERRARIUM_ID below.
  3) Run: python3 pi_lcd_client.py

Behavior:
  - Polls GET /lcd/:id/last every second. When a new command is present, executes it.
  - Supported actions: play (with url), pause, stop, set_url, set_volume.
  - For 'play' the script will start the player subprocess. For 'pause' it tries to
    toggle pause if supported (mpv/cvlc remote controls). This is a lightweight demo.
"""

import time
import requests
import subprocess
import shlex
import shutil
import sys

SERVER_URL = "http://localhost:3000"  # Change to your server's address
TERRARIUM_ID = "0"  # Match the terrarium id the app uses when sending commands
POLL_INTERVAL = 1.0

# Choose an available player command
PLAYER_CMD = None
if shutil.which("cvlc"):
    PLAYER_CMD = "cvlc"
elif shutil.which("mpv"):
    PLAYER_CMD = "mpv"
elif shutil.which("omxplayer"):
    PLAYER_CMD = "omxplayer"
else:
    print("Warning: no supported player found (cvlc/mpv/omxplayer). Install one and re-run.")

player_proc = None
current_url = None


def start_play(url, volume=None):
    global player_proc, current_url
    stop_play()
    current_url = url
    if not PLAYER_CMD:
        print("No player available to start playback")
        return
    print(f"Starting playback: {url}")
    if PLAYER_CMD == "cvlc":
        cmd = ["cvlc", "--no-audio"] if volume == 0 else ["cvlc"]
        cmd += ["--fullscreen", "--play-and-exit", url]
    elif PLAYER_CMD == "mpv":
        cmd = ["mpv", "--fullscreen", "--no-terminal", url]
    elif PLAYER_CMD == "omxplayer":
        cmd = ["omxplayer", "-o", "local", url]
    else:
        cmd = [PLAYER_CMD, url]

    try:
        player_proc = subprocess.Popen(cmd)
    except Exception as e:
        print("Failed to start player:", e)
        player_proc = None


def stop_play():
    global player_proc, current_url
    if player_proc:
        try:
            print("Stopping playback")
            player_proc.terminate()
            player_proc.wait(timeout=2)
        except Exception:
            try:
                player_proc.kill()
            except Exception:
                pass
        player_proc = None
    current_url = None


def handle_command(cmd):
    global current_url
    action = cmd.get("action")
    url = cmd.get("url")
    volume = cmd.get("volume")
    print("Received LCD command:", cmd)

    if action == "play":
        if not url and not current_url:
            print("No URL provided for play command")
            return
        start_play(url or current_url, volume)
    elif action == "stop":
        stop_play()
    elif action == "pause":
        # Simple approach: send SIGSTOP/SIGCONT to process as pause/resume fallback
        if player_proc and player_proc.poll() is None:
            try:
                print("Pausing playback (SIGSTOP)")
                player_proc.send_signal(subprocess.signal.SIGSTOP)
            except Exception as e:
                print("Pause not supported:", e)
        else:
            print("No active player to pause")
    elif action == "resume":
        if player_proc and player_proc.poll() is None:
            try:
                print("Resuming playback (SIGCONT)")
                player_proc.send_signal(subprocess.signal.SIGCONT)
            except Exception as e:
                print("Resume not supported:", e)
        else:
            print("No active player to resume")
    elif action == "set_url":
        if url:
            # start playing the new url immediately
            start_play(url, volume)
    elif action == "set_volume":
        print("Volume change requested (not implemented in demo):", volume)
    else:
        print("Unknown LCD action:", action)


def poll_loop():
    last_ts = None
    while True:
        try:
            r = requests.get(f"{SERVER_URL}/lcd/{TERRARIUM_ID}/last", timeout=3)
            if r.status_code == 200:
                payload = r.json()
                cmd = payload.get("command")
                if cmd and cmd.get("timestamp") != last_ts:
                    handle_command(cmd)
                    last_ts = cmd.get("timestamp")
            # else: 404 means no command
        except Exception as e:
            print("Poll error:", e)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    print("Pi LCD client starting. Player command:", PLAYER_CMD)
    try:
        poll_loop()
    except KeyboardInterrupt:
        print("Exiting, stopping player")
        stop_play()
        sys.exit(0)
