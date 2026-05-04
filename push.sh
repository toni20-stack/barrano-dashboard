#!/bin/bash
MSG="$1"
if [ -z "$MSG" ]; then
  echo "Eroare: lipsește mesajul de commit."
  exit 1
fi
git add .
git commit -m "$MSG"
git push
