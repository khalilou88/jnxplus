#!/bin/sh

# Update the underlying (Debian) OS, to make sure we have the latest security patches and libraries like 'GLIBC'
sudo apt-get update  && sudo apt-get -y upgrade

# Install dependencies
npm i
