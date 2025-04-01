# Chrome Debug Alias Setup

This document explains how to set up an alias for launching Chrome with remote debugging enabled, which is required for the deep research functionality in this project.

## Using the Shell Script

A shell script has been created in this project that launches Chrome with remote debugging enabled:

```bash
./start_chrome_debug.sh
```

You can customize the port and user data directory by passing arguments:

```bash
./start_chrome_debug.sh --port=9222 --user-data-dir=/tmp/chrome-testing
```

## Setting Up an Alias

To make it easier to launch Chrome with debugging from anywhere, you can add an alias to your shell configuration file. Follow these steps:

### For Bash (add to ~/.bashrc or ~/.bash_profile)

```bash
# Add this line to your ~/.bashrc or ~/.bash_profile
alias chrome-debug='/Users/willtrabazo/Development-iMac/browser-use-root/web-ui/start_chrome_debug.sh'
```

### For Zsh (add to ~/.zshrc)

```bash
# Add this line to your ~/.zshrc
alias chrome-debug='/Users/willtrabazo/Development-iMac/browser-use-root/web-ui/start_chrome_debug.sh'
```

### Apply Changes

After adding the alias to your configuration file, apply the changes:

```bash
# For Bash
source ~/.bashrc  # or source ~/.bash_profile

# For Zsh
source ~/.zshrc
```

## Usage

Once the alias is set up, you can start Chrome with debugging enabled from anywhere by typing:

```bash
chrome-debug
```

Or with custom parameters:

```bash
chrome-debug --port=9223 --user-data-dir=~/chrome-debug-profile
```

## For Your Deep Research Script

When using the `test_deep_research_script.py`, make sure Chrome is already running with remote debugging enabled before executing the script. The script is configured to connect to Chrome at `http://localhost:9222`.