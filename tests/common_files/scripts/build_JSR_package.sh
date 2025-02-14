#!/bin/bash

#
#  JShelter is a browser extension which increases level
#  of security, anonymity and privacy of the user while browsing the
#  internet.
#
#  Copyright (C) 2020  Martin Bednar
#
# SPDX-License-Identifier: GPL-3.0-or-later
#
#  This program is free software: you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation, either version 3 of the License, or
#  (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

# Go to root directory of JShelter project.
cd ../../../

# Set executable permission.
chmod +x ./fix_manifest.sh

# Clean previous build.
make clean

# Build.
make

# Create directory for JShelter package if does not exists.
mkdir -p ./tests/common_files/JShelter

# Create xpi package of JShelter for Mozilla Firefox from zip archive created by make.
cp -f ./jshelter_firefox.zip ./tests/common_files/JShelter/firefox.xpi

# Create crx package of JShelter for Google Chrome from source files.
google-chrome --pack-extension=./build/chrome >/dev/null 2>&1

# Remove unnecessary file created during crx package creating.
rm -rf ./build/chrome.pem

# Move crx package of JShelter to right location (same as xpi package of JShelter).
mv -f ./build/chrome.crx ./tests/common_files/JShelter/chrome.crx

# Go back to common scripts directory.
cd ./tests/common_files/scripts
