"use client";

// Dynamic map component rendering activity locations using Leaflet
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon issue in Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapProps {
  locations: { lat: number; lng: number; name: string }[];
}

function MapUpdater({ locations }: { locations: MapProps["locations"] }) {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      if (locations.length === 1) {
        map.setView([locations[0].lat, locations[0].lng], 13);
      } else {
        const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]);

  return null;
}

export default function Map({ locations }: MapProps) {
  if (!locations || locations.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', background: '#eee', borderRadius: '12px' }}>Waiting for itinerary to generate map...</div>;
  }

  const centerLat = locations[0].lat;
  const centerLng = locations[0].lng;

  return (
    <div style={{ width: "100%", height: "400px", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-md)", zIndex: 1, position: 'relative' }}>
      <MapContainer center={[centerLat, centerLng]} zoom={12} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        />
        {locations.map((loc, i) => (
          <Marker 
            key={`${loc.lat}-${loc.lng}-${i}`} 
            position={[loc.lat, loc.lng]}
            icon={customIcon}
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>{loc.name}</h3>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: "#FF5A5F", textDecoration: "none", fontWeight: 600, fontSize: "13px" }}
                >
                  📍 Open in Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        <MapUpdater locations={locations} />
      </MapContainer>
    </div>
  );
}
