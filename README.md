# Flow Image Automator

A Chrome extension that automates bulk image generation on Google Flow with support for reference images, random cooldowns, and auto-download.

## Features

✨ **Bulk Generation**
- Generate multiple images from a list of prompts
- Paste prompts separated by line breaks

🖼️ **Reference Images**
- Upload a global reference image applied to all prompts
- Reference images are required

⏱️ **Smart Cooldown**
- Random 10-15 second delay between each generation
- Reduces detection risk

⬇️ **Auto-Download**
- Automatically downloads all generated images
- Sequential naming: `image_001.png`, `image_002.png`, etc.
- Customizable folder name

⚙️ **Fixed Configuration**
- Model: Nano Banana 2 (NARWHAL)
- Aspect Ratio: Portrait (9:16)
- Quality: 1K - Original
- Stealth Mode: Enabled by default

## Installation

1. Clone this repository or download as ZIP
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon will appear in your Chrome toolbar

## Usage

1. **Open Google Flow** - Navigate to https://labs.google/fx/tools/flow/
2. **Open Extension** - Click the Flow Image Automator icon
3. **Upload Reference Image** - Click the file input and select your reference image (required)
4. **Paste Prompts** - Enter all your prompts in the text area, separated by line breaks
5. **Configure Folder** - (Optional) Change the download folder name
6. **Start Generation** - Click "🚀 Start Generation"
7. **Monitor Progress** - Watch the progress bar as images are generated
8. **View Downloads** - Generated images automatically download to your specified folder

## Prompt Format

One prompt per line or paragraph:

```
a cat dancing
a dog running
a bird flying
a cat sitting on a chair
```

The extension will automatically trim whitespace and filter empty lines.

## Configuration

All settings are fixed for optimal performance:
- **Model**: Nano Banana 2 (best quality/speed balance)
- **Aspect Ratio**: Portrait 9:16 (mobile-friendly)
- **Quality**: 1K Original (high resolution)
- **Cooldown**: Random 10-15s (avoids detection)
- **Download Quality**: Original
- **Auto-download**: Enabled
- **Stealth Mode**: Enabled

## Troubleshooting

**Authentication Error**
- Make sure you're logged into Google Flow
- Refresh the page and try again

**Images Not Downloading**
- Check your Chrome download settings
- Make sure the downloads folder has write permissions
- Check Chrome's download history

**Extension Not Working**
- Refresh the Google Flow page
- Restart Chrome if needed
- Check the browser console (F12) for errors

## Technical Details

- **API**: Google Flow Media API (`flowMedia:batchGenerateImages`)
- **Authentication**: Bearer token from Google authentication
- **reCAPTCHA**: Automatically handled
- **Rate Limiting**: Built-in random cooldown (10-15s)

## Permissions

The extension requires:
- `storage` - Save reference image and settings
- `downloads` - Auto-download generated images
- `tabs` - Access current tab for project ID
- `scripting` - Extract authentication tokens

## API Integration

Endpoint: `https://aisandbox-pa.googleapis.com/v1/projects/{projectId}/flowMedia:batchGenerateImages`

The extension uses your existing Google Flow session for authentication - no additional API keys needed.

## Limitations

- Requires active Google Flow session
- Limited by your Google account's image generation quota
- reCAPTCHA may occasionally block rapid requests
- Images must be downloaded through Chrome's download system

## License

MIT

## Support

For issues or feature requests, please open an issue on GitHub.
