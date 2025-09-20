# Photo Capture & AI Extraction Setup

This app captures photos using your device camera and extracts personal details using AI.

## Setup Instructions

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set up Environment Variables
Create a `.env` file in the root directory:

```bash
# OpenRouter API Key
# Get your API key from https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Get OpenRouter API Key
1. Go to [OpenRouter](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key and paste it in your `.env` file

### 4. Run the Development Server
```bash
pnpm dev
```

## Features

- 📷 **Camera Capture**: Take photos with front or back camera
- 🔄 **Camera Switching**: Toggle between cameras dynamically
- 🤖 **AI Extraction**: Extract personal details using Grok AI model
- 📋 **Structured Data**: Get first name, last name, ID number, and serial number
- 📱 **Responsive Design**: Works on desktop and mobile devices

## How It Works

1. **Capture Photo**: Use the camera to take a photo of a document
2. **AI Processing**: The image is sent to OpenRouter's Grok model for analysis
3. **Data Extraction**: AI extracts structured information in JSON format
4. **Display Results**: View the extracted data in a clean, organized format

## Supported Image Types

- PNG
- JPEG
- WebP
- GIF

## API Model Used

- **Model**: `x-ai/grok-4-fast:free`
- **Provider**: OpenRouter
- **Features**: Vision capabilities for image analysis

## Troubleshooting

### Camera Not Working
- Ensure you've granted camera permissions
- Try refreshing the page
- Check if your device has multiple cameras

### API Errors
- Verify your OpenRouter API key is correct
- Check your internet connection
- Ensure you have credits in your OpenRouter account

### Image Processing Fails
- Try with a clearer image
- Ensure the document is well-lit
- Make sure text is readable in the image
