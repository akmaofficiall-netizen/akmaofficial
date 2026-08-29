"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Crosshair, Search } from "lucide-react";

declare global {
  interface Window {
    neshan: any;
  }
}

interface NeshanMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  height?: string;
  neshanApiKey?: string;
}

const TEHRAN_CENTER = [51.389, 35.6892];

const IRAN_CITIES = [
  { name: "تهران", lat: 35.6892, lng: 51.389 },
  { name: "اصفهان", lat: 32.6546, lng: 51.668 },
  { name: "شیراز", lat: 29.5918, lng: 52.5836 },
  { name: "تبریز", lat: 38.08, lng: 46.2919 },
  { name: "مشهد", lat: 36.297, lng: 59.6067 },
  { name: "کرج", lat: 35.8403, lng: 50.9391 },
  { name: "قم", lat: 34.6416, lng: 50.8764 },
  { name: "اهواز", lat: 31.3183, lng: 48.6706 },
  { name: "رشت", lat: 37.2808, lng: 49.5832 },
  { name: "یزد", lat: 31.8974, lng: 54.3569 },
  { name: "زنجان", lat: 36.6769, lng: 48.4857 },
  { name: "همدان", lat: 34.7995, lng: 48.5149 },
  { name: "کرمانشاه", lat: 34.3142, lng: 47.065 },
  { name: "بندرعباس", lat: 27.1833, lng: 56.2725 },
  { name: "ارومیه", lat: 37.5527, lng: 45.0759 },
  { name: "ساری", lat: 36.5648, lng: 53.0585 },
  { name: "بیرجند", lat: 32.8649, lng: 59.2263 },
  { name: " bojnord", lat: 37.4731, lng: 57.3286 },
  { name: "گرگان", lat: 36.8428, lng: 54.4359 },
  { name: "سنندج", lat: 35.3178, lng: 46.9875 },
];

export const NeshanMapPicker: React.FC<NeshanMapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  height = "350px",
  neshanApiKey,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    if (window.neshan) {
      setSdkLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://static.neshan.org/sdk/web/ol/10.0.0/neshan-sdk.min.js";
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => setSdkLoaded(false);
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!sdkLoaded || !mapRef.current || mapInstance.current) return;

    try {
      const startLat = latitude || 35.6892;
      const startLng = longitude || 51.389;
      const apiKey = neshanApiKey || "web_xxxxxxxxxxxxxxxx";

      mapInstance.current = new window.neshan.maps.Map({
        container: mapRef.current,
        poi: false,
        mapType: window.neshan.maps.MapType.NESHAN,
        key: apiKey,
        center: [startLng, startLat],
        zoom: latitude ? 14 : 11,
      });

      mapInstance.current.on("click", (e: any) => {
        const coords = e.lngLat || e.coordinate;
        if (coords) {
          const lng = Array.isArray(coords) ? coords[0] : coords.lng;
          const lat = Array.isArray(coords) ? coords[1] : coords.lat;
          if (lat && lng) {
            updateMarker(lat, lng);
            onChange({ latitude: lat, longitude: lng });
          }
        }
      });
    } catch (err) {
      console.error("Neshan picker init error:", err);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy?.();
        mapInstance.current = null;
      }
    };
  }, [sdkLoaded, neshanApiKey]);

  useEffect(() => {
    if (!mapReady() || !latitude || !longitude) return;
    updateMarker(Number(latitude), Number(longitude));
    try {
      mapInstance.current.setCenter?.([Number(longitude), Number(latitude)]);
      mapInstance.current.setZoom?.(14);
    } catch {}
  }, [latitude, longitude]);

  const mapReady = () => mapInstance.current && sdkLoaded;

  const updateMarker = (lat: number, lng: number) => {
    if (!mapInstance.current) return;
    if (markerRef.current) {
      markerRef.current.setMap?.(null);
    }
    try {
      const el = document.createElement("div");
      el.style.cssText = `
        width:24px;height:24px;border-radius:50%;
        background:#ef4444;border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;
      `;
      markerRef.current = new window.neshan.maps.Marker({
        element: el,
        position: [lng, lat],
      });
      markerRef.current.setMap?.(mapInstance.current);
    } catch {}
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://api.neshan.org/v1/search?q=${encodeURIComponent(searchQuery)}&lat=35.6892&lng=51.389`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.items || []);
      }
    } catch {
      setSearchResults(IRAN_CITIES.filter((c) => c.name.includes(searchQuery)));
    }
  };

  const handleCityPreset = (city: { lat: number; lng: number }) => {
    if (mapInstance.current) {
      try {
        mapInstance.current.setCenter?.([city.lng, city.lat]);
        mapInstance.current.setZoom?.(13);
      } catch {}
    }
    updateMarker(city.lat, city.lng);
    onChange({ latitude: city.lat, longitude: city.lng });
  };

  const handleGpsLocate = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        if (mapInstance.current) {
          try {
            mapInstance.current.setCenter?.([lng, lat]);
            mapInstance.current.setZoom?.(15);
          } catch {}
        }
        updateMarker(lat, lng);
        onChange({ latitude: lat, longitude: lng });
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="جستجوی نشانی یا شهر..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 pr-10 pl-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleGpsLocate}
          disabled={gpsLoading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition"
        >
          <Crosshair className={`h-4 w-4 ${gpsLoading ? "animate-spin" : ""}`} />
          GPS
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 text-xs">
          {searchResults.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const lat = r.location?.y || r.lat;
                const lng = r.location?.x || r.lng;
                if (lat && lng) {
                  handleCityPreset({ lat, lng });
                  setSearchResults([]);
                  setSearchQuery(r.title || r.name || "");
                }
              }}
              className="w-full px-3 py-2 text-right text-slate-300 hover:bg-slate-700 border-b border-slate-700 last:border-0"
            >
              {r.title || r.name || JSON.stringify(r)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {IRAN_CITIES.slice(0, 8).map((city) => (
          <button
            key={city.name}
            type="button"
            onClick={() => handleCityPreset(city)}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] text-slate-400 hover:bg-emerald-900/40 hover:text-emerald-300 hover:border-emerald-700/50 transition"
          >
            {city.name}
          </button>
        ))}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-slate-700" style={{ height }}>
        <div ref={mapRef} className="w-full h-full" />
        {!sdkLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-slate-400 text-xs">
            بارگذاری نقشه نشان...
          </div>
        )}
      </div>

      {latitude && longitude && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-700/30 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-300">
          <MapPin className="h-3.5 w-3.5" />
          <span className="font-mono">{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</span>
          <a
            href={`https://nshn.ir/${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mr-auto text-emerald-400 hover:text-emerald-300 underline"
          >
            مشاهده در نشان
          </a>
        </div>
      )}
    </div>
  );
};
