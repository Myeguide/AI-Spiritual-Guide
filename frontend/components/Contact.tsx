import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/frontend/components/ui/card';
import { Phone, Mail, MapPin } from 'lucide-react';

// Leaflet Map component (no API key required)
const LeafletMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      cssLink.crossOrigin = '';
      document.head.appendChild(cssLink);
    }

    // Load Leaflet JS
    const loadLeaflet = () => {
      if (window.L) {
        initMap();
        return;
      }

      const existingScript = document.querySelector('script[src*="leaflet"]');
      if (existingScript) {
        existingScript.addEventListener('load', initMap);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = initMap;
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const L = window.L;

      // Coordinates for Ripple Digital Pvt. Ltd.
      const location: [number, number] = [19.1136, 72.9081];

      // Initialize map
      const map = L.map(mapRef.current).setView(location, 15);

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom icon
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background: #ef4444;
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              transform: rotate(45deg);
              color: white;
              font-weight: bold;
              font-size: 20px;
            ">📍</div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
      });

      // Add marker
      const marker = L.marker(location, { icon: customIcon }).addTo(map);

      // Add popup
      marker.bindPopup(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #1f2937;">Ripple Animation - Best Explainer Video</h3>
          <p style="font-size: 12px; color: #6b7280; margin-bottom: 8px; line-height: 1.4;">
            29 B, Senapati Bapat Marg, Kewal Industrial Estate, Lower Parel, Mumbai, Maharashtra 400013
          </p>
          <div style="margin-bottom: 8px;">
            <span style="color: #f59e0b; font-size: 12px;">★★★★☆</span>
            <span style="font-size: 12px; color: #6b7280; margin-left: 4px;">4.5 (52 reviews)</span>
          </div>
          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=19.1136,72.9081" 
            target="_blank" 
            rel="noopener noreferrer"
            style="
              color: #3b82f6; 
              font-size: 12px; 
              text-decoration: none; 
              font-weight: 500;
              display: inline-block;
            "
          >
            Get Directions →
          </a>
        </div>
      `).openPopup();

      mapInstanceRef.current = map;

      // Fix map display issues
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full rounded-lg" />;
};

// Declare Leaflet global
declare global {
  interface Window {
    L: any;
  }
}

const ContactPage: React.FC = () => {
  return (
    <div>
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Map Section */}
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-0">
              <div className="h-[500px]">
                <LeafletMap />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="shadow-lg border-none">
              <CardContent>
                <div className="mb-8">
                  
                  <h2 className="text-3xl font-bold mb-2">
                    Ripple Digital Pvt. Ltd.
                  </h2>
                </div>

                <div className="space-y-6">
                  {/* Address */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Address</h3>
                      <p className="leading-relaxed">
                        29/B, Kewal Industrial Estate,<br />
                        S B Marg, Lower Parel (W) Mumbai,<br />
                        Maharashtra - 400013
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      <a
                        href="tel:+919820034220"
                        className="hover:text-green-600 transition-colors"
                      >
                        +91 9820034220
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      <a
                        href="mailto:support@myeternalguide.com"
                        className=" hover:text-purple-600 transition-colors break-all"
                      >
                        support@myeternalguide.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="font-semibold mb-3">Business Hours</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Monday - Friday</span>
                      <span className="font-medium">9:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday</span>
                      <span className="font-medium">10:00 AM - 4:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span className="font-medium text-red-600">Closed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;