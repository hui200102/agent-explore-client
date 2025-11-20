#!/bin/bash

echo "🚀 Installing AI Chat Assistant Dependencies..."
echo ""

# Check which package manager is available
if command -v pnpm &> /dev/null; then
    echo "📦 Using pnpm..."
    pnpm add @radix-ui/react-avatar @radix-ui/react-scroll-area @radix-ui/react-slot class-variance-authority clsx lucide-react tailwind-merge
elif command -v yarn &> /dev/null; then
    echo "📦 Using yarn..."
    yarn add @radix-ui/react-avatar @radix-ui/react-scroll-area @radix-ui/react-slot class-variance-authority clsx lucide-react tailwind-merge
else
    echo "📦 Using npm..."
    npm install @radix-ui/react-avatar @radix-ui/react-scroll-area @radix-ui/react-slot class-variance-authority clsx lucide-react tailwind-merge
fi

echo ""
echo "✅ Dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Update .env.local with your backend API URL"
echo "  2. Run 'npm run dev' to start the development server"
echo "  3. Open http://localhost:3000 in your browser"
echo ""

