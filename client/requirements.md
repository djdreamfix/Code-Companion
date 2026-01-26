## Packages
leaflet | Core mapping library
react-leaflet | React bindings for Leaflet
socket.io-client | Real-time communication for map updates
framer-motion | Smooth animations for UI elements

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["'Outfit'", "sans-serif"],
  body: ["'DM Sans'", "sans-serif"],
}

Integration:
- Socket.IO connection to window.location.origin
- Service Worker registration for PWA and Push Notifications
- Leaflet CSS must be imported
