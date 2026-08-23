"use client";
import React, { useEffect, useState } from "react";
import { MapPin, RefreshCw } from "lucide-react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { CustomerGoogleMap } from "@/components/maps/CustomerGoogleMap";

export const CustomerMapView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedHealth, setSelectedHealth] = useState("all");
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const fetchData = async () => { const r = await fetch("/api/customers").then(x=>x.json()); if (r.success) setCustomers(r.customers||[]); };
  useEffect(()=>{fetchData();},[]);
  const filtered = customers.filter(c=>selectedHealth==="all" || c.healthStatus===selectedHealth);
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><MapPin className="h-6 w-6 text-rose-400"/>نقشه Google مشتریان</h2><p className="text-xs text-slate-400 mt-1">موقعیت مشتریان روی Google Maps؛ نشانگرها کوچک هستند و با انتخاب مشتری بزرگ می‌شوند.</p></div>
      <div className="flex items-center gap-2"><select value={selectedHealth} onChange={e=>setSelectedHealth(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"><option value="all">همه</option><option value="green">سبز</option><option value="yellow">زرد</option><option value="red">قرمز</option></select><button onClick={fetchData} className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400"><RefreshCw className="h-4 w-4"/></button></div>
    </div>
    <CustomerGoogleMap customers={filtered} selectedId={activeCustomer?.id} onSelect={setActiveCustomer}/>
    {activeCustomer && <div className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-4 flex items-center justify-between"><div><b className="text-white">{activeCustomer.storeName||activeCustomer.name}</b><p className="text-xs text-slate-400 mt-1">{activeCustomer.address||activeCustomer.city} · {activeCustomer.mobile}</p></div><NeonBadge variant={activeCustomer.healthStatus}>سلامت {activeCustomer.healthScore}</NeonBadge></div>}
  </div>;
};
