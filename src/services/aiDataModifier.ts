import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { logAuditEvent } from "./audit";

export interface AIActionPayload {
  actionType:
    | "APPLY_INFLATION_PRODUCTS"
    | "APPLY_INFLATION_RAW_MATERIALS"
    | "UPDATE_VISITOR_COMMISSIONS"
    | "CREATE_PRODUCT"
    | "CREATE_CUSTOMER"
    | "CREATE_SUPPLIER"
    | "UPDATE_PRODUCT_PRICE";
  parameters: Record<string, any>;
  description: string;
}

export async function executeAIAction(action: AIActionPayload, userId?: string) {
  const { actionType, parameters, description } = action;

  switch (actionType) {
    case "APPLY_INFLATION_PRODUCTS": {
      const percent = Number(parameters.percent || parameters.percentage || 0);
      if (isNaN(percent) || percent === 0) {
        throw new Error("درصد تغییر قیمت محصولات نامعتبر است.");
      }

      const multiplier = 1 + percent / 100;
      const allProducts = await db.select().from(schema.products);
      let updatedCount = 0;

      for (const prod of allProducts) {
        const oldPrice = Number(prod.basePrice || 0);
        const newPrice = Math.round(oldPrice * multiplier);

        await db
          .update(schema.products)
          .set({
            basePrice: String(newPrice),
            updatedAt: new Date(),
          })
          .where(eq(schema.products.id, prod.id));
        updatedCount++;
      }

      // Also update project custom prices if requested
      const projectPrices = await db.select().from(schema.projectProductPrices);
      for (const pp of projectPrices) {
        const oldPp = Number(pp.customPrice || 0);
        const newPp = Math.round(oldPp * multiplier);
        await db
          .update(schema.projectProductPrices)
          .set({ customPrice: String(newPp) })
          .where(eq(schema.projectProductPrices.id, pp.id));
      }

      await logAuditEvent("UPDATE", "products_bulk", "all", {
        action: "APPLY_INFLATION_PRODUCTS",
        percent,
        updatedCount,
        description,
      });

      return {
        success: true,
        message: `تورم ${percent}% با موفقیت بر روی قیمت ${updatedCount} محصول سیستم اعمال گردید.`,
        updatedCount,
        percent,
      };
    }

    case "APPLY_INFLATION_RAW_MATERIALS": {
      const percent = Number(parameters.percent || parameters.percentage || 0);
      if (isNaN(percent) || percent === 0) {
        throw new Error("درصد تغییر قیمت مواد اولیه نامعتبر است.");
      }

      const multiplier = 1 + percent / 100;
      const allMaterials = await db.select().from(schema.rawMaterials);
      let updatedCount = 0;

      for (const rm of allMaterials) {
        const oldCost = Number(rm.currentCost || 0);
        const newCost = Math.round(oldCost * multiplier);

        await db
          .update(schema.rawMaterials)
          .set({
            currentCost: String(newCost),
            updatedAt: new Date(),
          })
          .where(eq(schema.rawMaterials.id, rm.id));

        // Add history log
        await db.insert(schema.rawMaterialPriceHistory).values({
          rawMaterialId: rm.id,
          oldCost: String(oldCost),
          newCost: String(newCost),
          changePercent: String(percent),
          reason: "inflation_adjustment",
          sourceReference: "AI Inflation Adjustment",
        });

        updatedCount++;
      }

      await logAuditEvent("UPDATE", "raw_materials_bulk", "all", {
        action: "APPLY_INFLATION_RAW_MATERIALS",
        percent,
        updatedCount,
      });

      return {
        success: true,
        message: `نرخ تورم ${percent}% بر روی قیمت ${updatedCount} قلم ماده اولیه اعمال شد.`,
        updatedCount,
      };
    }

    case "UPDATE_VISITOR_COMMISSIONS": {
      const percent = Number(parameters.percent || parameters.rate || 0);
      const commissionBase = parameters.commissionBase; // "sales_total" or "net_profit"

      const updateData: any = { updatedAt: new Date() };
      if (percent > 0) updateData.commissionRatePercent = String(percent);
      if (commissionBase) updateData.commissionBase = commissionBase;

      const employeesList = await db.select().from(schema.employees);
      let count = 0;

      for (const emp of employeesList) {
        if (emp.role === "visitor" || emp.cooperationType === "visitor" || !parameters.onlyVisitors) {
          await db.update(schema.employees).set(updateData).where(eq(schema.employees.id, emp.id));
          count++;
        }
      }

      await logAuditEvent("UPDATE", "employees_commission", "all", {
        percent,
        commissionBase,
        count,
      });

      return {
        success: true,
        message: `تنظیمات پورسانت برای ${count} نفر از پرسنل ویزیتوری با موفقیت به‌روزرسانی شد.`,
        count,
      };
    }

    case "CREATE_PRODUCT": {
      const name = parameters.name;
      if (!name) throw new Error("نام محصول الزامی است.");
      const code = parameters.code || `PRD-${Date.now().toString().slice(-5)}`;
      const basePrice = String(parameters.basePrice || parameters.price || 0);
      const category = parameters.category || "عمومی";

      const [newProd] = await db
        .insert(schema.products)
        .values({
          name,
          code,
          basePrice,
          category,
          unit: parameters.unit || "عدد",
          status: "active",
        })
        .returning();

      await logAuditEvent("CREATE", "product", newProd.id, { name, code, basePrice });
      return { success: true, message: `محصول جدید «${name}» با موفقیت در سیستم ثبت شد.`, product: newProd };
    }

    case "CREATE_CUSTOMER": {
      const name = parameters.name;
      const mobile = parameters.mobile || "09120000000";
      if (!name) throw new Error("نام مشتری الزامی است.");
      const code = parameters.code || `CUST-${Date.now().toString().slice(-4)}`;

      const [newCust] = await db
        .insert(schema.customers)
        .values({
          name,
          code,
          mobile,
          city: parameters.city || "تهران",
          storeName: parameters.storeName || "",
          address: parameters.address || "",
        })
        .returning();

      await logAuditEvent("CREATE", "customer", newCust.id, { name, code, mobile });
      return { success: true, message: `مشتری «${name}» با موفقیت در سامانه ایجاد شد.`, customer: newCust };
    }

    default:
      throw new Error(`عملیات ناشناخته: ${actionType}`);
  }
}
