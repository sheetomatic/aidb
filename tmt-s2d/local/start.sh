#!/bin/sh
cd "$(dirname "$0")"
python3 -m http.server 8765 --bind 0.0.0.0
