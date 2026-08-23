"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardView } from "@/components/views/DashboardView";
import { RawMaterialsView } from "@/components/views/RawMaterialsView";
import { ProductsView } from "@/components/views/ProductsView";
import { InvoicesView } from "@/components/views/InvoicesView";
import { CustomersView } from "@/components/views/CustomersView";
import { CustomerMapView } from "@/components/views/CustomerMapView";
import { ProductionView } from "@/components/views/ProductionView";
import { InventoryView } from "@/components/views/InventoryView";
import { PurchasesView } from "@/components/views/PurchasesView";
import { FinancialView } from "@/components/views/FinancialView";
import { EmployeesView } from "@/components/views/EmployeesView";
import { ReportsView } from "@/components/views/ReportsView";
import { AlertsView } from "@/components/views/AlertsView";
import { AiAssistantView } from "@/components/views/AiAssistantView";
import { BackupView } from "@/components/views/BackupView";
import { SettingsView } from "@/components/views/SettingsView";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView selectedProjectId={selectedProjectId} onNavigate={setActiveTab} />;
      case "raw_materials":
        return <RawMaterialsView />;
      case "products":
        return <ProductsView />;
      case "invoices":
        return <InvoicesView selectedProjectId={selectedProjectId} />;
      case "customers":
        return <CustomersView />;
      case "customer_map":
        return <CustomerMapView />;
      case "production":
        return <ProductionView selectedProjectId={selectedProjectId} />;
      case "inventory":
        return <InventoryView />;
      case "purchases":
        return <PurchasesView />;
      case "financial":
        return <FinancialView />;
      case "employees":
        return <EmployeesView />;
      case "reports":
        return <ReportsView selectedProjectId={selectedProjectId} />;
      case "alerts":
        return <AlertsView selectedProjectId={selectedProjectId} />;
      case "ai":
        return <AiAssistantView selectedProjectId={selectedProjectId} />;
      case "backup":
        return <BackupView />;
      case "settings":
        return <SettingsView />;
      default:
        return <DashboardView selectedProjectId={selectedProjectId} onNavigate={setActiveTab} />;
    }
  };

  return (
    <AppLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedProjectId={selectedProjectId}
      setSelectedProjectId={setSelectedProjectId}
    >
      {renderActiveView()}
    </AppLayout>
  );
}
