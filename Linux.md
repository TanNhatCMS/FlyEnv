# Linux Installation Notes

## System Requirements

### Required Packages
```bash
sudo apt-get install -y make g++
```

## Running FlyEnv on Linux

### Ubuntu/Debian
After installing the .deb package:
```bash
flyenv
```

Or if installed via download:
```bash
./FlyEnv --no-sandbox
```

### Common Issues

#### Application Won't Start
If the application doesn't start or shows a blank screen:

1. **GPU/Sandbox Issues**: Try running with the `--no-sandbox` flag:
   ```bash
   flyenv --no-sandbox
   ```

2. **Missing Dependencies**: Ensure you have the required system libraries:
   ```bash
   sudo apt-get install -y libgtk-3-0 libnotify4 libnss3 libxss1 libxtst6 xdg-utils libatspi2.0-0 libdrm2 libgbm1 libxcb-dri3-0
   ```

3. **Check Logs**: Look for error messages in:
   - `~/.flyenv-launch-flag` (if created, indicates first launch failed)
   - System logs: `journalctl -xe`

#### Permissions Issues
If you encounter permission errors, ensure the application has execute permissions:
```bash
chmod +x /path/to/FlyEnv
```

### Building from Source

1. Install dependencies:
   ```bash
   cd FlyEnv
   yarn install
   ```

2. Build the application:
   ```bash
   yarn run build
   ```

The built packages will be in the `release/` directory.
