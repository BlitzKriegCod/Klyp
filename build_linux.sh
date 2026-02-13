#!/bin/bash
# Build script for Klyp on Linux

set -e

echo "=========================================="
echo "Klyp - Linux Build"
echo "=========================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

echo "Python version:"
python3 --version

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "Error: pip3 is not installed"
    exit 1
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
pip3 install -r requirements.txt

# Install PyInstaller if not already installed
echo ""
echo "Installing PyInstaller..."
pip3 install pyinstaller

# Clean previous builds
echo ""
echo "Cleaning previous builds..."
rm -rf build dist

# Build the application
echo ""
echo "Building application..."
pyinstaller build_config.spec

# Check if build was successful
if [ -d "dist/Klyp" ]; then
    echo ""
    echo "=========================================="
    echo "Build successful!"
    echo "Application location: dist/Klyp/"
    echo "=========================================="
    echo ""
    echo "To run the application:"
    echo "  cd dist/Klyp"
    echo "  ./Klyp"
    echo ""
    
    # Create a simple launcher script
    cat > dist/Klyp/run.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
./Klyp
EOF
    chmod +x dist/Klyp/run.sh
    
    echo "A launcher script has been created: dist/Klyp/run.sh"
else
    echo ""
    echo "Build failed!"
    exit 1
fi

# Optional: Create .deb package
echo ""
read -p "Do you want to create a .deb package? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Creating .deb package..."
    
    # Create package structure
    PKG_NAME="klyp"
    PKG_VERSION="1.1.0"
    PKG_DIR="dist/${PKG_NAME}_${PKG_VERSION}"
    
    mkdir -p "${PKG_DIR}/DEBIAN"
    mkdir -p "${PKG_DIR}/usr/local/bin"
    mkdir -p "${PKG_DIR}/usr/share/applications"
    mkdir -p "${PKG_DIR}/usr/share/pixmaps"
    mkdir -p "${PKG_DIR}/opt/${PKG_NAME}"
    
    # Copy application files
    cp -r dist/Klyp/* "${PKG_DIR}/opt/${PKG_NAME}/"
    
    # Copy icon if it exists
    if [ -f "assets/klyp_logo.png" ]; then
        cp assets/klyp_logo.png "${PKG_DIR}/usr/share/pixmaps/${PKG_NAME}.png"
        ICON_LINE="Icon=${PKG_NAME}"
    elif [ -f "dist/Klyp/_internal/assets/klyp_logo.png" ]; then
        cp dist/Klyp/_internal/assets/klyp_logo.png "${PKG_DIR}/usr/share/pixmaps/${PKG_NAME}.png"
        ICON_LINE="Icon=${PKG_NAME}"
    else
        echo "Warning: Icon not found, .desktop entry will not have an icon"
        ICON_LINE=""
    fi
    
    # Create launcher script
    cat > "${PKG_DIR}/usr/local/bin/${PKG_NAME}" << EOF
#!/bin/bash
cd /opt/${PKG_NAME}
./Klyp
EOF
    chmod +x "${PKG_DIR}/usr/local/bin/${PKG_NAME}"
    
    # Create desktop entry
    cat > "${PKG_DIR}/usr/share/applications/${PKG_NAME}.desktop" << EOF
[Desktop Entry]
Version=1.1.0
Type=Application
Name=Klyp
Comment=Video downloader application
Exec=/usr/local/bin/${PKG_NAME}
${ICON_LINE}
Terminal=false
Categories=Network;AudioVideo;
EOF
    
    # Create control file
    cat > "${PKG_DIR}/DEBIAN/control" << EOF
Package: ${PKG_NAME}
Version: ${PKG_VERSION}
Section: net
Priority: optional
Architecture: amd64
Maintainer: Klyp Development Team
Description: Klyp
 A GUI application for downloading videos from multiple platforms
 with support for queue management, multi-threaded downloads,
 and various quality options.
EOF
    
    # Build .deb package
    dpkg-deb --build "${PKG_DIR}"
    
    if [ -f "${PKG_DIR}.deb" ]; then
        echo ""
        echo "=========================================="
        echo ".deb package created successfully!"
        echo "Package location: ${PKG_DIR}.deb"
        echo "=========================================="
        echo ""
        echo "To install:"
        echo "  sudo dpkg -i ${PKG_DIR}.deb"
    else
        echo "Failed to create .deb package"
    fi
fi

echo ""
echo "Build process complete!"
