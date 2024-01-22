import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    "background_color": "#3d736e",
    "description": "AI chat trained on 15k IslamQA answers",
    "dir": "ltr",
    "display": "standalone",
    "name": "IslamChat",
    "orientation": "portrait-primary",
    "scope": "/",
    "short_name": "IslamChat",
    "start_url": "/",
    "theme_color": "#3d736e",
    "categories": [
      "lifestyle",
      "utilities"
    ],
    "screenshots": [
      {
        "src": "https://islamchat.deen.ai/screenshot.png",
        "sizes": "750x1334",
        "type": "image/png",
        // "description": "IslamChat Main Screen"
      }
    ],
    "icons": [
      {
        "src": "/favicon.ico",
        "type": "image/x-icon",
        "sizes": "48x48"
      },
      {
        "src": "/favicon.ico",
        "type": "image/x-icon"
      }
    ],
    "shortcuts": [
      {
        "name": "Chat",
        "url": "https://islamchat.deen.ai/",
        "description": "Chat with IslamChat"
      }
    ],
    "id": "ai.deen.islamchat",
    "lang": "en"
  };
}