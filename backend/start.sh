#!/bin/bash
flask db upgrade
python -m gunicorn --bind 0.0.0.0:10000 run:app