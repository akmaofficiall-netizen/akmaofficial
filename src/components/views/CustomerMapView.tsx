"use client";

import React, { useEffect, useState, useRef } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  MapPin,
  Phone,
  Users,
  Activity,
  Filter,
  RefreshCw,
  Navigation,
  ExternalLink,
  Compass,
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  Crosshair,
  Store,
  ChevronLeft
} from "lucide-react";
import "leaflet/dist/leaflet.css";

// Popular Iranian cities coordinates for quick camera jumps
const IRAN_CITIES = [
  { name: "تهران", lat: 35.6892, lng: 51.3890, zoom: 12 },
  { name: "مشهد", lat: 36.2972, lng: 59.6067, zoom: 12 },
  { name: "اصفهان", lat: 32.6546, lng: 51.6680, zoom: 12 },
  { name: "شیراز", lat: 29.5918, lng: 52.5837, zoom: 12 },
  { name: "تبریز", lat: 38.0800, lng: 46.2919, zoom: 12 },
  { name: "کرج", lat: 35.8327, lng: 50.9915, zoom: 12 },
  { name: "اهواز", lat: 31.3183, lng: 48.6706, zoom: 12 },
  { name: "قم", lat: 34.6401, lng: 50.8764, zoom: 12 },
];

export const CustomerMapView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHealth, setSelectedHealth] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapMode, setMapMode] = useState<"standard" | "satellite">("standard");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers").then((r) => r.json());
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (err) {
      console.error("Failed to load map customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize Leaflet Map safely in client
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      if (!mapContainerRef.current || !isMounted) return;

      // Create Leaflet map instance
      const map = L.map(mapContainerRef.current, {
        center: [35.6892, 51.3890],
        zoom: 12,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Base tile layer with Persian label support
      const standardTiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://neshan.org">نقشه نشان</a> | داده‌های مکانی آکما',
        maxZoom: 19,
      });

      standardTiles.addTo(map);

      // Layer group for dynamic customer markers
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Filter customers based on status and search query
  const filteredCustomers = customers.filter((c) => {
    if (selectedHealth !== "all" && c.healthStatus !== selectedHealth) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(term);
      const matchStore = c.storeName?.toLowerCase().includes(term);
      const matchCity = c.city?.toLowerCase().includes(term);
      const matchMobile = c.mobile?.includes(term);
      if (!matchName && !matchStore && !matchCity && !matchMobile) return false;
    }
    return true;
  });

  // Update map markers whenever filtered customers change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || typeof window === "undefined") return;

    const updateMarkers = async () => {
      const L = (await import("leaflet")).default;
      const markersGroup = markersGroupRef.current;
      markersGroup.clearLayers();

      const bounds = L.latLngBounds([]);
      let validPinsCount = 0;

      filteredCustomers.forEach((cust) => {
        const lat = Number(cust.latitude);
        const lng = Number(cust.longitude);

        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

        validPinsCount++;
        bounds.extend([lat, lng]);

        // Define status color palette
        let pinColor = "#10b981"; // green
        let glowColor = "rgba(16, 185, 129, 0.4)";
        let bgClass = "bg-emerald-500";
        let borderClass = "border-emerald-300";

        if (cust.healthStatus === "yellow") {
          pinColor = "#f59e0b";
          glowColor = "rgba(245, 158, 11, 0.4)";
          bgClass = "bg-amber-500";
          borderClass = "border-amber-300";
        } else if (cust.healthStatus === "red") {
          pinColor = "#f43f5e";
          glowColor = "rgba(244, 63, 94, 0.4)";
          bgClass = "bg-rose-500";
          borderClass = "border-rose-300";
        }

        // Custom HTML Pin Marker
        const customIcon = L.divIcon({
          className: "custom-map-pin",
          html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer;">
              <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${glowColor}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; z-index: 10; width: 28px; height: 28px; border-radius: 50%; background: #0f172a; border: 2.5px solid ${pinColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
                <span style="font-size: 11px; font-weight: 800; color: #ffffff;">${cust.healthScore || 80}</span>
              </div>
              <div style="position: absolute; bottom: -4px; width: 6px; height: 6px; background: ${pinColor}; transform: rotate(45deg); z-index: 5;"></div>
            </div>
          `,
          iconSize: [34, 38],
          iconAnchor: [17, 36],
          popupAnchor: [0, -36],
        });

        const marker = L.marker([lat, lng], { icon: customIcon });

        // Build rich Neshan action popup
        const neshanRouteUrl = `https://neshan.org/maps/route?origin=&destination=${lat},${lng}`;
        const neshanViewUrl = `https://neshan.org/maps/@${lat},${lng},17z`;

        const popupContent = `
          <div style="direction: rtl; font-family: 'Vazirmatn', sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 6px;">
              <strong style="font-size: 13px; color: #0f172a;">${cust.name}</strong>
              <span style="font-size: 10px; padding: 2px 6px; border-radius: 999px; background: ${pinColor}; color: #ffffff; font-weight: bold;">
                سلامت ${cust.healthScore}٪
              </span>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              <strong>فروشگاه:</strong> ${cust.storeName || "مشتری حقیقی"}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              <strong>تلفن:</strong> <a href="tel:${cust.mobile}" style="color: #2563eb; text-decoration: none; font-family: monospace;">${cust.mobile}</a>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">
              <strong>آدرس:</strong> ${cust.address || cust.city || "تهران"}
            </div>
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <a href="${neshanRouteUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #2563eb; color: #ffffff; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px;">
                مسیریابی در نشان
              </a>
              <a href="${neshanViewUrl}" target="_blank" rel="noopener noreferrer" style="text-align: center; background: #0f172a; color: #ffffff; padding: 5px 8px; border-radius: 6px; font-size: 11px; text-decoration: none;">
                نمایش نشان
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on("click", () => {
          setActiveCustomer(cust);
        });

        marker.addTo(markersGroup);
      });

      if (validPinsCount > 0 && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    };

    updateMarkers();
  }, [filteredCustomers]);

  // Fly to customer on map
  const handleSelectCustomer = async (cust: any) => {
    setActiveCustomer(cust);
    const lat = Number(cust.latitude);
    const lng = Number(cust.longitude);

    if (mapInstanceRef.current && !isNaN(lat) && !isNaN(lng) && lat !== 0) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.2 });
    }
  };

  // Fly to Iranian city
  const handleJumpCity = (city: typeof IRAN_CITIES[0]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([city.lat, city.lng], city.zoom, { duration: 1.5 });
    }
  };

  // Locate User GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current) {
          const L = (await import("leaflet")).default;
          mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });

          // Add user pin
          const userIcon = L.divIcon({
            className: "user-loc-pin",
            html: `
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #3b82f6; border: 3px solid #ffffff; box-shadow: 0 0 14px #3b82f6;"></div>
            `,
            iconSize: [20, 20],
          });
          L.marker([latitude, longitude], { icon: userIcon })
            .bindPopup("<div style='font-family:Vazirmatn; font-size:12px;'>موقعیت کنونی شما</div>")
            .addTo(mapInstanceRef.current);
        }
      },
      (err) => {
        setLocating(false);
        alert("امکان دریافت موقعیت مکانی فراهم نشد. لطفاً دسترسی GPS را در مرورگر مجاز کنید.");
      }
    );
  };

  // Open direct Neshan Navigation from user location to target
  const handleOpenNeshanRoute = (cust: any) => {
    const lat = cust.latitude || 35.6892;
    const lng = cust.longitude || 51.3890;
    const originParam = userLocation ? `origin=${userLocation.lat},${userLocation.lng}&` : "origin=&";
    const url = `https://neshan.org/maps/route?${originParam}destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  // Calculate statistics
  const greenCount = customers.filter((c) => c.healthStatus === "green").length;
  const yellowCount = customers.filter((c) => c.healthStatus === "yellow").length;
  const redCount = customers.filter((c) => c.healthStatus === "red").length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <MapPin className="h-5 w-5" />
            </div>
            نقشه تعاملی و یکپارچه‌سازی با اپلیکیشن نشان (Neshan Map)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            پایش جغرافیایی پراکندگی مشتریان، مسیریابی مستقیم در اپلیکیشن نشان و تحلیل منطقه‌ای امتیاز سلامت CRM
          </p>
        </div>

        {/* Quick Health Stats Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>سالم و فعال:</span>
            <strong className="font-mono font-bold text-white">{greenCount}</strong>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-xs text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>هشدار سررسید:</span>
            <strong className="font-mono font-bold text-white">{yellowCount}</strong>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span>بحرانی / معوق:</span>
            <strong className="font-mono font-bold text-white">{redCount}</strong>
          </div>

          <button
            onClick={fetchData}
            title="به‌روزرسانی داده‌ها"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-600 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>بروزرسانی</span>
          </button>
        </div>
      </div>

      {/* Filter & City Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="جستجوی مشتری، فروشگاه یا شماره..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Health Filter */}
          <div className="flex items-center gap-1">
            <select
              value={selectedHealth}
              onChange={(e) => setSelectedHealth(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">تمام وضعیت‌های سلامت</option>
              <option value="green">فقط وضعیت سبز (سالم)</option>
              <option value="yellow">فقط وضعیت زرد (هشدار)</option>
              <option value="red">فقط وضعیت قرمز (بحرانی)</option>
            </select>
          </div>

          {/* GPS Location Button */}
          <button
            onClick={handleLocateMe}
            disabled={locating}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-950/40 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-900/50 transition-all"
          >
            <Crosshair className={`h-3.5 w-3.5 ${locating ? "animate-spin text-blue-400" : ""}`} />
            <span>موقعیت من</span>
          </button>
        </div>

        {/* Iranian Cities Quick Jump */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] text-slate-400 whitespace-nowrap pl-1">پرش به شهر:</span>
          {IRAN_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => handleJumpCity(city)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 hover:border-blue-500 hover:text-blue-300 transition-all whitespace-nowrap"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map + Customer List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Leaflet Interactive Map Container */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl relative min-h-[560px]">
          {/* Map canvas */}
          <div ref={mapContainerRef} className="w-full h-[560px] z-0" />

          {/* Map floating header banner */}
          <div className="absolute top-4 right-4 z-[400] flex items-center gap-2">
            <div className="rounded-xl border border-slate-800/90 bg-slate-950/85 backdrop-blur-md px-3 py-2 text-xs shadow-xl flex items-center gap-2 text-white">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>نقشه زنده نشان</span>
              <span className="text-[10px] text-slate-400 border-r border-slate-700 pr-2 mr-1">
                {filteredCustomers.length} مشتری بارگذاری شد
              </span>
            </div>
          </div>

          {/* Quick Map Legend (Bottom-Left) */}
          <div className="absolute bottom-4 left-4 z-[400] rounded-xl border border-slate-800/90 bg-slate-950/90 backdrop-blur-md p-2.5 text-[11px] shadow-2xl space-y-1.5">
            <div className="font-bold text-white text-[11px] pb-1 border-b border-slate-800 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-blue-400" />
              راهنمای نشانگرها:
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span>امتیاز بالای ۷۵ (خرید منظم و بدون بدهی)</span>
            </div>
            <div className="flex items-center gap-2 text-amber-400">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
              <span>امتیاز ۵۰ تا ۷۴ (نزدیک به سررسید)</span>
            </div>
            <div className="flex items-center gap-2 text-rose-400">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              <span>زیر ۵۰ (چک برگشتی / معوق / ریسک بالا)</span>
            </div>
          </div>
        </div>

        {/* Sidebar: Customer Cards with Direct Neshan Navigation */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Active Selected Customer Showcase */}
          {activeCustomer ? (
            <div className="rounded-2xl border border-blue-500/40 bg-slate-900/95 p-4 shadow-xl backdrop-blur-md space-y-3 transition-all animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{activeCustomer.name}</h3>
                    <p className="text-xs text-slate-400">{activeCustomer.storeName || "مشتری حقیقی"}</p>
                  </div>
                </div>

                <NeonBadge variant={activeCustomer.healthStatus} size="sm">
                  سلامت {activeCustomer.healthScore}٪
                </NeonBadge>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">شماره تماس:</span>
                  <a href={`tel:${activeCustomer.mobile}`} className="font-mono text-blue-400 hover:underline">
                    {activeCustomer.mobile}
                  </a>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400">شهر و منطقه:</span>
                  <span>{activeCustomer.city || "تهران"} {activeCustomer.region ? `(${activeCustomer.region})` : ""}</span>
                </div>

                <div className="flex items-start justify-between text-slate-300">
                  <span className="text-slate-400 whitespace-nowrap">آدرس دقیق:</span>
                  <span className="text-right text-[11px] text-slate-300 pr-2">
                    {activeCustomer.address || "آدرس ثبت نشده است"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span className="text-slate-400">مختصات نشان:</span>
                  <span className="font-mono text-[10px] text-purple-400">
                    {Number(activeCustomer.latitude).toFixed(4)}, {Number(activeCustomer.longitude).toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Neshan Deep Link Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleOpenNeshanRoute(activeCustomer)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  <span>مسیریابی در نشان</span>
                </button>

                <a
                  href={`https://neshan.org/maps/@${activeCustomer.latitude},${activeCustomer.longitude},17z`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>وب‌سایت نشان</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-400">
              <MapPin className="h-6 w-6 text-slate-600 mx-auto mb-1.5" />
              <span>روی هر یک از مشتریان لیست زیر یا نشانگرهای نقشه کلیک کنید تا اطلاعات و مسیریابی مستقیم در نشان فعال شود.</span>
            </div>
          )}

          {/* Customer Scrollable List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2 backdrop-blur-md max-h-[440px] overflow-y-auto">
            <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800 text-xs">
              <span className="font-bold text-white">فهرست مشتریان ({filteredCustomers.length})</span>
              <span className="text-[11px] text-slate-400">کلیک جهت مشاهده روی نقشه</span>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                مشتری با شرایط انتخاب‌شده یافت نشد.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = activeCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
                      isSelected
                        ? "border-blue-500 bg-slate-850 shadow-md shadow-blue-500/10"
                        : "border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            c.healthStatus === "green"
                              ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                              : c.healthStatus === "yellow"
                              ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                              : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                          }`}
                        />
                        <span className="font-bold text-xs text-white">{c.name}</span>
                      </div>

                      <NeonBadge variant={c.healthStatus} size="sm">
                        {c.healthScore}
                      </NeonBadge>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{c.storeName || c.city || "تهران"}</span>
                      <span className="font-mono text-slate-500">{c.mobile}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
