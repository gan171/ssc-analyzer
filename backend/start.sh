#!/bin/bash
flask db upgrade
gunicorn --bind 0.0.0.0:10000 run:app