"use client";

import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    neshan: any;
  }
}

export interface NeshanCustomer {
  id: string;
  name: string;
  code?: string;
  latitude: number | null;
  longitude: number | null;
  healthStatus?: string;
  healthScore?: number;
  mobile?: string;
  storeName?: string;
}

interface NeshanMapProps {
  customers: NeshanCustomer[];
  selectedId?: string | null;
  onSelectCustomer?: (customer: NeshanCustomer) => void;
  height?: string;
  neshanApiKey?: string;
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: "#22c55e",
  warning: "#eab308",
  critical: "#ef4444",
  active: "#22c55e",
  inactive: "#94a3b8",
};

const TEHRAN_CENTER = [51.389, 35.6892];

export const NeshanMap: React.FC<NeshanMapProps> = ({
  customers,
  selectedId,
  onSelectCustomer,
  height = "500px",
  neshanApiKey,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<NeshanCustomer | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  useEffect(() => {
    if (window.neshan) {
      setSdkLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://static.neshan.org/sdk/web/ol/10.0.0/neshan-sdk.min.js";
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      console.warn("Neshan SDK failed to load, falling back to OSM");
      setSdkLoaded(false);
    };
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!sdkLoaded || !mapRef.current || mapInstance.current) return;

    try {
      const apiKey = neshanApiKey || "web_xxxxxxxxxxxxxxxx";
      mapInstance.current = new window.neshan.maps.Map({
        container: mapRef.current,
        poi: false,
        mapType: window.neshan.maps.MapType.NESHAN,
        key: apiKey,
        center: TEHRAN_CENTER,
        zoom: 11,
      });

      mapInstance.current.on("click", (e: any) => {
        setActiveCustomer(null);
      });

      setMapReady(true);
    } catch (err) {
      console.error("Neshan map init error:", err);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy?.();
        mapInstance.current = null;
      }
    };
  }, [sdkLoaded, neshanApiKey]);

  useEffect(() => {
    if (!mapReady || !mapInstance.current) return;

    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];

    const validCustomers = customers.filter(
      (c) => c.latitude != null && c.longitude != null && !isNaN(Number(c.latitude)) && !isNaN(Number(c.longitude))
    );

    validCustomers.forEach((c) => {
      const color = HEALTH_COLORS[c.healthStatus || "active"] || "#3b82f6";
      const isSelected = c.id === selectedId;

      try {
        const marker = new window.neshan.maps.Marker({
          element: (() => {
            const el = document.createElement("div");
            el.style.cssText = `
              width:${isSelected ? 20 : 14}px;
              height:${isSelected ? 20 : 14}px;
              border-radius:50%;
              background:${color};
              border:${isSelected ? "3px solid #ffffff" : "2px solid #ffffff"};
              box-shadow:0 1px 4px rgba(0,0,0,0.3);
              cursor:pointer;
              transition:transform 0.15s;
            `;
            el.onmouseenter = () => { el.style.transform = "scale(1.3)"; };
            el.onmouseleave = () => { el.style.transform = "scale(1)"; };
            return el;
          })(),
          position: [Number(c.longitude), Number(c.latitude)],
        });

        marker.addListener?.("click", () => {
          setActiveCustomer(c);
          onSelectCustomer?.(c);
        });

        marker.setMap?.(mapInstance.current);
        markersRef.current.push(marker);
      } catch {}
    });

    if (validCustomers.length > 0 && !selectedId) {
      try {
        const bounds = validCustomers.reduce(
          (b, c) => {
            const lng = Number(c.longitude);
            const lat = Number(c.latitude);
            return {
              minLng: Math.min(b.minLng, lng),
              maxLng: Math.max(b.maxLng, lng),
              minLat: Math.min(b.minLat, lat),
              maxLat: Math.max(b.maxLat, lat),
            };
          },
          { minLng: 180, maxLng: -180, minLat: 90, maxLat: -90 }
        );
        mapInstance.current.setCenter?.([
          (bounds.minLng + bounds.maxLng) / 2,
          (bounds.minLat + bounds.maxLat) / 2,
        ]);
        mapInstance.current.setZoom?.(12);
      } catch {}
    }
  }, [customers, selectedId, mapReady]);

  const withLocation = customers.filter((c) => c.latitude != null && c.longitude != null);
  const withoutLocation = customers.filter((c) => c.latitude == null || c.longitude == null);

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden border border-slate-700" style={{ height }}>
        <div ref={mapRef} className="w-full h-full" />
        {!sdkLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-slate-400 text-sm">
            <div className="text-center space-y-2">
              <div>نقشه در حال بارگذاری...</div>
              <div className="text-[10px]">SDK نشان بارگذاری نشد. از API Key صحیح مطمئن شوید.</div>
            </div>
          </div>
        )}
      </div>

      {activeCustomer && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-300 flex justify-between items-center">
          <div>
            <span className="font-bold text-white">{activeCustomer.name}</span>
            {activeCustomer.storeName && <span className="mr-2 text-slate-400">({activeCustomer.storeName})</span>}
            {activeCustomer.mobile && <span className="mr-2 text-slate-400">{activeCustomer.mobile}</span>}
            <span className="mr-2 text-slate-500">
              [{Number(activeCustomer.latitude).toFixed(6)}, {Number(activeCustomer.longitude).toFixed(6)}]
            </span>
          </div>
          <div className="flex gap-2">
            <a
              href={`https://nshn.ir/${Number(activeCustomer.latitude)},${Number(activeCustomer.longitude)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
            >
              نشان
            </a>
            <a
              href={`https://www.google.com/maps?q=${activeCustomer.latitude},${activeCustomer.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-500"
            >
              Google Maps
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-2.5 text-center">
          <div className="text-lg font-black text-white">{customers.length}</div>
          <div className="text-slate-400">کل مشتریان</div>
        </div>
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-2.5 text-center">
          <div className="text-lg font-black text-emerald-400">{withLocation.length}</div>
          <div className="text-slate-400">دارای لوکیشن</div>
        </div>
        <div className="rounded-xl border border-rose-700/50 bg-rose-950/30 p-2.5 text-center">
          <div className="text-lg font-black text-rose-400">{withoutLocation.length}</div>
          <div className="text-slate-400">بدون لوکیشن</div>
        </div>
      </div>
    </div>
  );
};
