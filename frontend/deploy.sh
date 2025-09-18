#!/bin/bash
npm run build
rm -rf ../docs
cp -r build ../docs
echo "Build deployed to docs folder for GitHub Pages"