import { sql } from "drizzle-orm";
import { db } from "@/db";

let schemaEnsured = false;

/**
 * Ensures all ERP tables and relations exist in the database.
 */
export async function ensureDatabaseSchema() {
  if (schemaEnsured) return;

  const statements = [
    // 1. System Settings
    `CREATE TABLE IF NOT EXISTS system_settings (
      id text PRIMARY KEY DEFAULT 'main_config',
      business_name text DEFAULT 'سازمان و کسب‌وکار حکمت آکما',
      tax_number text,
      currency text DEFAULT 'تومان',
      number_format text DEFAULT 'fa-IR',
      pricing_rule text DEFAULT 'tiered_margin',
      health_green_threshold integer DEFAULT 75,
      health_yellow_threshold integer DEFAULT 50,
      map_provider text DEFAULT 'neshan',
      openai_api_key text,
      openai_model text DEFAULT 'gpt-4o',
      ai_enabled boolean DEFAULT true,
      auto_backup_interval_hours integer DEFAULT 24,
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 2. Projects
    `CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      label text,
      description text,
      icon text DEFAULT 'folder',
      color text DEFAULT '#3b82f6',
      status text NOT NULL DEFAULT 'active',
      start_date timestamp,
      end_date timestamp,
      pricing_settings jsonb DEFAULT '{"defaultMarginPercent": 25}',
      commission_settings jsonb DEFAULT '{"defaultRatePercent": 5}',
      accounting_settings jsonb DEFAULT '{"taxEnabled": false, "defaultTaxRate": 10}',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 3. Employees
    `CREATE TABLE IF NOT EXISTS employees (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      mobile text NOT NULL,
      role text NOT NULL DEFAULT 'visitor',
      status text NOT NULL DEFAULT 'active',
      base_salary numeric(15,2) DEFAULT '0',
      commission_rate_percent numeric(5,2) DEFAULT '5',
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 4. Employee Project Memberships
    `CREATE TABLE IF NOT EXISTS employee_project_memberships (
      employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      assigned_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (employee_id, project_id)
    )`,

    // 5. Customers
    `CREATE TABLE IF NOT EXISTS customers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      store_name text,
      mobile text NOT NULL,
      phone text,
      email text,
      address text,
      city text DEFAULT 'تهران',
      region text,
      postal_code text,
      latitude numeric(10,6) DEFAULT '35.6892',
      longitude numeric(10,6) DEFAULT '51.3890',
      payment_terms_days integer DEFAULT 30,
      credit_limit numeric(15,2) DEFAULT '0',
      assigned_employee_id uuid REFERENCES employees(id),
      status text NOT NULL DEFAULT 'active',
      health_score integer NOT NULL DEFAULT 85,
      health_status text NOT NULL DEFAULT 'green',
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 6. Customer Project Memberships
    `CREATE TABLE IF NOT EXISTS customer_project_memberships (
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      assigned_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (customer_id, project_id)
    )`,

    // 7. Customer Health Logs
    `CREATE TABLE IF NOT EXISTS customer_health_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      previous_score integer NOT NULL,
      new_score integer NOT NULL,
      previous_status text NOT NULL,
      new_status text NOT NULL,
      breakdown jsonb NOT NULL,
      reason text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 8. Suppliers
    `CREATE TABLE IF NOT EXISTS suppliers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      contact_person text,
      mobile text NOT NULL,
      phone text,
      email text,
      address text,
      city text DEFAULT 'تهران',
      notes text,
      payable_balance numeric(15,2) DEFAULT '0',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 9. Raw Materials
    `CREATE TABLE IF NOT EXISTS raw_materials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      unit text NOT NULL DEFAULT 'کیلوگرم',
      unit_conversion_factor numeric(10,4) DEFAULT '1.0000',
      secondary_unit text,
      stock_quantity numeric(15,4) NOT NULL DEFAULT '0',
      min_stock_quantity numeric(15,4) NOT NULL DEFAULT '10',
      current_cost numeric(15,2) NOT NULL DEFAULT '0',
      average_cost numeric(15,2) NOT NULL DEFAULT '0',
      supplier_id uuid REFERENCES suppliers(id),
      cost_policy text NOT NULL DEFAULT 'average',
      status text NOT NULL DEFAULT 'active',
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 10. Raw Material Price History
    `CREATE TABLE IF NOT EXISTS raw_material_price_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      raw_material_id uuid NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
      old_cost numeric(15,2) NOT NULL,
      new_cost numeric(15,2) NOT NULL,
      change_percent numeric(7,2) NOT NULL,
      reason text DEFAULT 'manual_edit',
      source_reference text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 11. Products
    `CREATE TABLE IF NOT EXISTS products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      category text NOT NULL DEFAULT 'عمومی',
      unit text NOT NULL DEFAULT 'عدد',
      pack_quantity integer DEFAULT 1,
      image_url text,
      base_price numeric(15,2) NOT NULL DEFAULT '0',
      calculated_cost numeric(15,2) NOT NULL DEFAULT '0',
      stock_quantity numeric(15,4) NOT NULL DEFAULT '0',
      min_stock_quantity numeric(15,4) NOT NULL DEFAULT '5',
      target_stock_quantity numeric(15,4) DEFAULT '50',
      commission_rate_percent numeric(5,2) DEFAULT '5',
      status text NOT NULL DEFAULT 'active',
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 12. Product Recipes (BOM)
    `CREATE TABLE IF NOT EXISTS product_recipes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      raw_material_id uuid NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
      quantity_required numeric(15,4) NOT NULL,
      wastage_percent numeric(5,2) DEFAULT '0',
      notes text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 13. Project Product Prices
    `CREATE TABLE IF NOT EXISTS project_product_prices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      custom_price numeric(15,2) NOT NULL,
      override_commission_rate numeric(5,2),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // Unique index for project_product_prices
    `CREATE UNIQUE INDEX IF NOT EXISTS uniq_project_product_price ON project_product_prices (project_id, product_id)`,

    // 14. Warehouses
    `CREATE TABLE IF NOT EXISTS warehouses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      type text NOT NULL DEFAULT 'central',
      project_id uuid REFERENCES projects(id),
      address text,
      is_default boolean DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 15. Inventory Ledger
    `CREATE TABLE IF NOT EXISTS inventory_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      warehouse_id uuid NOT NULL REFERENCES warehouses(id),
      item_type text NOT NULL,
      item_id uuid NOT NULL,
      transaction_type text NOT NULL,
      quantity_change numeric(15,4) NOT NULL,
      quantity_before numeric(15,4) NOT NULL,
      quantity_after numeric(15,4) NOT NULL,
      unit_cost_snapshot numeric(15,2) DEFAULT '0',
      total_cost_snapshot numeric(15,2) DEFAULT '0',
      reference_type text,
      reference_id uuid,
      project_id uuid REFERENCES projects(id),
      notes text,
      created_by_id uuid,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 16. Purchases
    `CREATE TABLE IF NOT EXISTS purchases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_number text NOT NULL UNIQUE,
      supplier_id uuid NOT NULL REFERENCES suppliers(id),
      project_id uuid REFERENCES projects(id),
      purchase_date timestamp NOT NULL DEFAULT now(),
      subtotal numeric(15,2) NOT NULL DEFAULT '0',
      discount numeric(15,2) DEFAULT '0',
      tax numeric(15,2) DEFAULT '0',
      grand_total numeric(15,2) NOT NULL DEFAULT '0',
      paid_amount numeric(15,2) NOT NULL DEFAULT '0',
      status text NOT NULL DEFAULT 'completed',
      payment_status text NOT NULL DEFAULT 'unpaid',
      notes text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 17. Purchase Items
    `CREATE TABLE IF NOT EXISTS purchase_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      item_type text NOT NULL DEFAULT 'raw_material',
      item_id uuid NOT NULL,
      quantity numeric(15,4) NOT NULL,
      unit text NOT NULL,
      unit_cost numeric(15,2) NOT NULL,
      total_cost numeric(15,2) NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 18. Production Batches
    `CREATE TABLE IF NOT EXISTS production_batches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_number text NOT NULL UNIQUE,
      product_id uuid NOT NULL REFERENCES products(id),
      project_id uuid REFERENCES projects(id),
      quantity_produced numeric(15,4) NOT NULL,
      total_material_cost numeric(15,2) NOT NULL DEFAULT '0',
      labor_cost numeric(15,2) DEFAULT '0',
      overhead_cost numeric(15,2) DEFAULT '0',
      packaging_cost numeric(15,2) DEFAULT '0',
      total_batch_cost numeric(15,2) NOT NULL DEFAULT '0',
      unit_cost numeric(15,2) NOT NULL DEFAULT '0',
      production_date timestamp NOT NULL DEFAULT now(),
      status text NOT NULL DEFAULT 'completed',
      notes text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 19. Production Batch Items
    `CREATE TABLE IF NOT EXISTS production_batch_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_id uuid NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
      raw_material_id uuid NOT NULL REFERENCES raw_materials(id),
      quantity_consumed numeric(15,4) NOT NULL,
      unit_cost_snapshot numeric(15,2) NOT NULL,
      total_cost_snapshot numeric(15,2) NOT NULL,
      waste_quantity numeric(15,4) DEFAULT '0',
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 20. Invoices
    `CREATE TABLE IF NOT EXISTS invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number text NOT NULL UNIQUE,
      customer_id uuid NOT NULL REFERENCES customers(id),
      project_id uuid REFERENCES projects(id),
      sales_mode text NOT NULL DEFAULT 'direct',
      employee_id uuid REFERENCES employees(id),
      intermediary_employee_id uuid REFERENCES employees(id),
      invoice_date timestamp NOT NULL DEFAULT now(),
      due_date timestamp,
      subtotal numeric(15,2) NOT NULL DEFAULT '0',
      line_discounts_total numeric(15,2) DEFAULT '0',
      invoice_discount numeric(15,2) DEFAULT '0',
      tax_total numeric(15,2) DEFAULT '0',
      grand_total numeric(15,2) NOT NULL DEFAULT '0',
      cogs_total numeric(15,2) NOT NULL DEFAULT '0',
      gross_profit_total numeric(15,2) NOT NULL DEFAULT '0',
      paid_amount numeric(15,2) NOT NULL DEFAULT '0',
      balance_due numeric(15,2) NOT NULL DEFAULT '0',
      payment_status text NOT NULL DEFAULT 'unpaid',
      status text NOT NULL DEFAULT 'issued',
      reversal_reason text,
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 21. Invoice Items
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id uuid NOT NULL REFERENCES products(id),
      product_name_snapshot text NOT NULL,
      quantity numeric(15,4) NOT NULL,
      unit_price numeric(15,2) NOT NULL,
      unit_cost_snapshot numeric(15,2) NOT NULL,
      discount_amount numeric(15,2) DEFAULT '0',
      line_total numeric(15,2) NOT NULL,
      line_cogs numeric(15,2) NOT NULL,
      line_profit numeric(15,2) NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 22. Accounts
    `CREATE TABLE IF NOT EXISTS accounts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text NOT NULL UNIQUE,
      name text NOT NULL,
      type text NOT NULL,
      account_number text,
      bank_name text,
      balance numeric(15,2) NOT NULL DEFAULT '0',
      is_default boolean DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 23. Payments
    `CREATE TABLE IF NOT EXISTS payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_number text NOT NULL UNIQUE,
      customer_id uuid REFERENCES customers(id),
      supplier_id uuid REFERENCES suppliers(id),
      invoice_id uuid REFERENCES invoices(id),
      project_id uuid REFERENCES projects(id),
      account_id uuid NOT NULL REFERENCES accounts(id),
      payment_type text NOT NULL,
      amount numeric(15,2) NOT NULL,
      payment_date timestamp NOT NULL DEFAULT now(),
      payment_method text NOT NULL DEFAULT 'pos',
      reference_number text,
      status text NOT NULL DEFAULT 'completed',
      notes text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 24. Payment Allocations
    `CREATE TABLE IF NOT EXISTS payment_allocations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      allocated_amount numeric(15,2) NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 25. Commission Rules
    `CREATE TABLE IF NOT EXISTS commission_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      project_id uuid REFERENCES projects(id),
      product_id uuid REFERENCES products(id),
      employee_id uuid REFERENCES employees(id),
      rule_type text NOT NULL DEFAULT 'percentage',
      rate_value numeric(15,2) NOT NULL,
      effective_start_date timestamp,
      effective_end_date timestamp,
      is_active boolean DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 26. Commission Ledger
    `CREATE TABLE IF NOT EXISTS commission_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id uuid NOT NULL REFERENCES employees(id),
      invoice_id uuid REFERENCES invoices(id),
      project_id uuid REFERENCES projects(id),
      rule_snapshot jsonb NOT NULL,
      base_amount numeric(15,2) NOT NULL,
      commission_amount numeric(15,2) NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      payment_id uuid REFERENCES payments(id),
      notes text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 27. Payroll Records
    `CREATE TABLE IF NOT EXISTS payroll_records (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      period_name text NOT NULL,
      employee_id uuid NOT NULL REFERENCES employees(id),
      project_id uuid REFERENCES projects(id),
      base_salary numeric(15,2) NOT NULL DEFAULT '0',
      commission_earned numeric(15,2) NOT NULL DEFAULT '0',
      bonus numeric(15,2) DEFAULT '0',
      advances numeric(15,2) DEFAULT '0',
      deductions numeric(15,2) DEFAULT '0',
      net_payable numeric(15,2) NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      payment_id uuid REFERENCES payments(id),
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 28. Expenses
    `CREATE TABLE IF NOT EXISTS expenses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_number text NOT NULL UNIQUE,
      category text NOT NULL DEFAULT 'عمومی',
      amount numeric(15,2) NOT NULL,
      project_id uuid REFERENCES projects(id),
      employee_id uuid REFERENCES employees(id),
      account_id uuid REFERENCES accounts(id),
      expense_date timestamp NOT NULL DEFAULT now(),
      title text NOT NULL,
      description text,
      receipt_image_url text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 29. Consignments
    `CREATE TABLE IF NOT EXISTS consignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      consignment_number text NOT NULL UNIQUE,
      customer_id uuid NOT NULL REFERENCES customers(id),
      employee_id uuid REFERENCES employees(id),
      project_id uuid REFERENCES projects(id),
      issue_date timestamp NOT NULL DEFAULT now(),
      status text NOT NULL DEFAULT 'delivered',
      total_consigned_value numeric(15,2) NOT NULL DEFAULT '0',
      total_sold_value numeric(15,2) DEFAULT '0',
      total_collected numeric(15,2) DEFAULT '0',
      notes text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 30. Consignment Items
    `CREATE TABLE IF NOT EXISTS consignment_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      consignment_id uuid NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
      product_id uuid NOT NULL REFERENCES products(id),
      quantity_delivered numeric(15,4) NOT NULL,
      quantity_sold numeric(15,4) NOT NULL DEFAULT '0',
      quantity_returned numeric(15,4) NOT NULL DEFAULT '0',
      unit_price numeric(15,2) NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 31. Alerts
    `CREATE TABLE IF NOT EXISTS alerts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL,
      severity text NOT NULL DEFAULT 'warning',
      title text NOT NULL,
      message text NOT NULL,
      entity_type text,
      entity_id uuid,
      project_id uuid REFERENCES projects(id),
      status text NOT NULL DEFAULT 'new',
      dedup_key text UNIQUE,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 32. Tasks
    `CREATE TABLE IF NOT EXISTS tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text,
      assigned_employee_id uuid REFERENCES employees(id),
      entity_type text,
      entity_id uuid,
      due_date timestamp,
      priority text NOT NULL DEFAULT 'medium',
      status text NOT NULL DEFAULT 'open',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )`,

    // 33. Audit Logs
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      action text NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid,
      user_id text DEFAULT 'system_user',
      user_name text DEFAULT 'کاربر سیستم',
      details jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    )`,

    // 34. Backups
    `CREATE TABLE IF NOT EXISTS backups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      filename text NOT NULL,
      size_bytes integer NOT NULL,
      checksum text NOT NULL,
      status text NOT NULL DEFAULT 'completed',
      backup_data jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    )`
  ];

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
    } catch (err: any) {
      console.warn("Schema initialization statement warning:", err?.message || err);
    }
  }

  schemaEnsured = true;
}

export async function ensureRawMaterialsSchema() {
  await ensureDatabaseSchema();
}
